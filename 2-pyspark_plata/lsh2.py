import json
import os
import time
import numpy as np
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum as spark_sum, count, desc, udf
from pyspark.ml.feature import VectorAssembler, StandardScaler
from pyspark.sql.types import StringType
from pymongo import MongoClient
from pyspark.errors.exceptions.captured import AnalysisException

def main():
    print("Iniciando sesión de Spark para la capa de Plata...")
    spark = SparkSession.builder \
        .appName("Medallion-Silver-LSH") \
        .config("spark.driver.memory", "4g") \
        .getOrCreate()

    # =========================================================
    # FASE 1: LEER DATOS (CAPA BRONCE - HADOOP)
    # =========================================================
    start_time = time.time()
    csv_path = "hdfs://namenode:9000/capa-bronce/clientes_bronce.csv"
    print(f"Leyendo capa Bronce (Hadoop HDFS) desde: {csv_path}")

    # Espera un poco a que el archivo aparezca en HDFS si la subida aún no terminó.
    df = None
    ultimo_error = None
    for intento in range(1, 11):
        try:
            df = spark.read.csv(csv_path, header=True, inferSchema=True)
            break
        except AnalysisException as e:
            ultimo_error = e
            print(f"[!] No se encontró el CSV en HDFS (intento {intento}/10). Reintentando en 5 segundos...")
            time.sleep(5)

    if df is None:
        raise RuntimeError(
            f"No fue posible leer '{csv_path}' después de varios intentos. "
            f"Verifica que upload_to_hdfs haya subido el archivo correctamente. Error original: {ultimo_error}"
        )
    
    # =========================================================
    # FASE 2: PREPROCESAMIENTO Y LSH CON PYSPARK (CAPA PLATA)
    # =========================================================
    feature_cols = ['ingreso_mensual', 'score_crediticio', 'monto_solicitado', 'antiguedad_laboral_meses', 'deuda_actual']
    
    assembler = VectorAssembler(inputCols=feature_cols, outputCol="features_vec")
    df_assembled = assembler.transform(df)

    scaler = StandardScaler(inputCol="features_vec", outputCol="scaled_features", withStd=True, withMean=True)
    scaler_model = scaler.fit(df_assembled)
    df_scaled = scaler_model.transform(df_assembled)

    # Configuración LSH para 1 Millón (K=16 es el punto dulce)
    K = 16 
    np.random.seed(42)  # Semilla para consistencia
    R = np.random.randn(K, len(feature_cols))
    
    # Guardar parametros LSH para inferencia en el motor
    scaler_mean = scaler_model.mean.toArray().tolist() if scaler_model.mean else [0]*len(feature_cols)
    scaler_std = scaler_model.std.toArray().tolist() if scaler_model.std else [1]*len(feature_cols)
    
    print("Guardando parámetros del modelo LSH (medias del scaler y matriz R) en JSON...")
    parametros_lsh = {
        'scaler_mean': scaler_mean,
        'scaler_scale': scaler_std,
        'R': R.tolist()
    }
    ruta_json = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lsh_params.json")
    with open(ruta_json, "w") as f:
        json.dump(parametros_lsh, f)

    # Definir UDF para calcular la firma LSH usando Broadcast para acelerar
    R_broadcast = spark.sparkContext.broadcast(R)
    
    def compute_lsh_signature(scaled_features):
        vec = scaled_features.toArray()
        proyeccion = vec @ R_broadcast.value.T
        bits = (proyeccion >= 0).astype(int).astype(str)
        return ''.join(bits)
        
    lsh_udf = udf(compute_lsh_signature, StringType())
    
    print("Calculando firmas LSH en PySpark distribuidamente...")
    df_signed = df_scaled.withColumn("firma_lsh", lsh_udf(col("scaled_features")))

    # =========================================================
    # FASE 3: REPORTE DE RIESGO
    # =========================================================
    print("\n--- ANÁLISIS DE BALDES Y PROBABILIDAD DE FRAUDE ---")
    
    resumen_baldes = df_signed.groupBy("firma_lsh").agg(
        count("es_fraude").alias("total_solicitudes"),
        spark_sum("es_fraude").alias("fraudes_detectados")
    )
    
    resumen_baldes = resumen_baldes.withColumn(
        "probabilidad_fraude_%", 
        (col("fraudes_detectados") / col("total_solicitudes")) * 100
    )
    
    # Para evitar errores si spark no puede ordenar un float local, ordenamos los locales.
    print("TOP 5 BALDES DE ALTO RIESGO:")
    baldes_peligrosos = resumen_baldes.filter(col("fraudes_detectados") > 0) \
                        .orderBy(desc("probabilidad_fraude_%")) \
                        .limit(5)
    baldes_peligrosos.show()

    end_time = time.time()
    
    print("Realizando Action en Spark (Cálculo total)...")
    num_rows = df.count()
    num_baldes = resumen_baldes.count()
    print(f"Total solicitudes procesadas (Bronce): {num_rows:,}")
    print(f"Total baldes (firmas) creados: {num_baldes:,}")
    print(f"Tiempo total de procesamiento con PySpark: {end_time - start_time:.2f} segundos\n")

    # =========================================================
    # FASE 4: GUARDAR RESULTADOS EN MONGODB (CAPA ORO)
    # =========================================================
    print("\n--- FASE 4: GUARDADO EN MONGODB (CAPA ORO) ---")
    print("Conectando a MongoDB para guardar los resultados (incluyendo la firma y etiqueta 'es_fraude')...")

    # Eliminamos columnas de vectores usadas en transformaciones que pymongo no entiende nativamente
    df_final = df_signed.drop("features_vec", "scaled_features")
    
    MONGO_HOST = os.getenv("MONGO_HOST", "mongodb")
    MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
    MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
    MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "password")
    MONGO_DB = os.getenv("MONGO_DB", "bank_db")
    MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "clientes_lsh")

    connection_string = f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/"
    
    try:
        # Prueba conexión en el Driver antes de enviar a executors
        client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print(f"✓ Conexión exitosa a Mongo ({MONGO_HOST}:{MONGO_PORT}) en el Driver.")
        client.close()
        
        # Guardaremos paralelamente en MongoDB usando partition iterators
        def save_partition_to_mongo(iterator):
            from pymongo import MongoClient
            client_exec = MongoClient(connection_string)
            db = client_exec[MONGO_DB]
            coll = db[MONGO_COLLECTION]
            
            batch = []
            batch_size = 50000
            total_inserted = 0
            
            for row in iterator:
                batch.append(row.asDict())
                if len(batch) >= batch_size:
                    coll.insert_many(batch)
                    total_inserted += len(batch)
                    batch = []
                    
            if batch:
                coll.insert_many(batch)
                total_inserted += len(batch)
                
            client_exec.close()
            yield total_inserted
            
        print(f"Iniciando escritura distribuida de particiones a la colección '{MONGO_COLLECTION}'...")
        rdd_counts = df_final.rdd.mapPartitions(save_partition_to_mongo).collect()
        total_mongo = sum(rdd_counts)
        print(f"\n✓ ¡Se han guardado {total_mongo:,} registros junto con sus firmas LSH en MongoDB interactuando a través de PySpark (Capa Oro)!")
        
    except Exception as e:
        print(f"\n✗ Ocurrió un error al guardar en MongoDB: {e}")

    spark.stop()

if __name__ == "__main__":
    main()
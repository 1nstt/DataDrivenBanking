import pandas as pd
import numpy as np
import os
import json
import time
import uuid
from datetime import datetime
from pymongo import MongoClient, errors

# =========================================================
# CONFIGURACIÓN DE MONGODB
# =========================================================
MONGO_HOST = os.getenv("MONGO_HOST", "mongodb") # Si corres en local sin docker usa "localhost"
MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "password")
MONGO_DB = os.getenv("MONGO_DB", "bank_db")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "clientes_lsh")

def conectar_mongodb_con_reintentos():
    connection_string = f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/"
    cliente = MongoClient(connection_string, serverSelectionTimeoutMS=3000)
    
    max_intentos = 10
    for intento in range(1, max_intentos + 1):
        try:
            print(f"[*] Verificando conexión a MongoDB ({MONGO_HOST}:{MONGO_PORT}) - Intento {intento}/{max_intentos}...")
            cliente.admin.command('ping')
            print("✓ ¡Conexión a MongoDB establecida exitosamente!\n")
            return cliente
        except errors.ConnectionFailure:
            if intento < max_intentos:
                print("MongoDB aún no está listo. Reintentando en 3 segundos...\n")
                time.sleep(3)
            else:
                print("Error crítico: Se agotaron los intentos de conexión a MongoDB.")
                exit(1)

client = conectar_mongodb_con_reintentos()

def evaluar_cliente(nuevo_cliente_df, mean, scale, R):
    # 1. Escalar los datos manualmente usando la media y desviación estándar de la base histórica
    cliente_escalado = (nuevo_cliente_df.values - mean) / scale
    
    # 2. Calcular firma LSH con la MISMA matriz de proyección R
    proyecciones = cliente_escalado @ R.T
    bits = (proyecciones >= 0).astype(int).astype(str)
    firma_lsh = ''.join(bits[0])
    
    print(f"\n[+] Firma LSH calculada para el cliente: {firma_lsh}")
    
    # 3. Consultar a MongoDB usando Aggregation Pipeline
    db = client[MONGO_DB]
    collection = db[MONGO_COLLECTION]
    
    pipeline = [
        {"$match": {"firma_lsh": firma_lsh}},
        {"$group": {
            "_id": "$firma_lsh",
            "total_clientes": {"$sum": 1},
            "fraudes_detectados": {"$sum": "$es_fraude"}
        }}
    ]
    
    print("[+] Consultando historial en MongoDB...")
    resultados = []
    for intento in range(1, 11):
        resultados = list(collection.aggregate(pipeline))
        if resultados:
            break
        if intento < 10:
            print(f"[!] Sin historial todavía para esta firma. Reintentando consulta ({intento}/10)...")
            time.sleep(3)
    
    id_solicitud = str(uuid.uuid4())
    resultado_evaluacion = {
        "id_solicitud": id_solicitud,
        "fecha": datetime.now().isoformat(),
        "datos_cliente": nuevo_cliente_df.to_dict(orient="records")[0],
        "firma_lsh": firma_lsh
    }
    
    if not resultados:
        print("\n--- REPORTE DE RIESGO ---")
        print("El cliente pertenece a un balde nuevo sin historial.")
        print("Riesgo desconocido. -> DECISIÓN AUTOMÁTICA: REVISIÓN MANUAL")
        resultado_evaluacion["decision"] = "REVISION"
        resultado_evaluacion["razon"] = "Balde sin historial. Riesgo desconocido."
        resultado_evaluacion["probabilidad_fraude"] = "Desconocida"
    else:
        stats = resultados[0]
        total = stats['total_clientes']
        fraudes = stats['fraudes_detectados']
        porcentaje_fraude = (fraudes / total) * 100 if total > 0 else 0
        
        # 4. Mostrar Reporte y Tomar Decisión
        print("\n--- REPORTE DE RIESGO DEL MOTOR ---")
        print(f"Bucket LSH (Firma)                  : {firma_lsh}")
        print(f"Total clientes guardados en el balde  : {total}")
        print(f"Casos de Fraude histórico en balde    : {fraudes}")
        print(f"Probabilidad de Fraude inferida       : {porcentaje_fraude:.2f}%")
        
        resultado_evaluacion["historial"] = {
            "total_balde": total,
            "fraudes_balde": fraudes,
            "probabilidad_fraude": f"{porcentaje_fraude:.2f}%"
        }
        
        print("\n[+] EJECUCIÓN DE REGLAS LOW-CODE:")
        if porcentaje_fraude >= 15.0:
            print("-> ACCIÓN AUTOMÁTICA: ALERTA ROJA (Rechazar Solicitud / Bloquear)")
            resultado_evaluacion["decision"] = "RECHAZADA"
            resultado_evaluacion["razon"] = f"Alta probabilidad de fraude ({porcentaje_fraude:.2f}%) en su segmento."
        elif porcentaje_fraude >= 2.0:
            print("-> ACCIÓN AUTOMÁTICA: ALERTA AMARILLA (Pasar a revisión manual exhaustiva)")
            resultado_evaluacion["decision"] = "REVISION_EXHAUSTIVA"
            resultado_evaluacion["razon"] = f"Riesgo moderado de fraude detectado ({porcentaje_fraude:.2f}%)."
        else:
            print("-> ACCIÓN AUTOMÁTICA: ALERTA VERDE (Aprobar Solicitud)")
            resultado_evaluacion["decision"] = "APROBADA"
            resultado_evaluacion["razon"] = f"Bajo riesgo de fraude ({porcentaje_fraude:.2f}%). Comportamiento confiable."

    # 5. Guardar la evaluación en un archivo JSON en disco
    directorio_salida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evaluaciones")
    os.makedirs(directorio_salida, exist_ok=True)
    ruta_archivo_salida = os.path.join(directorio_salida, f"solicitud_{id_solicitud}.json")
    
    with open(ruta_archivo_salida, "w", encoding="utf-8") as f:
        json.dump(resultado_evaluacion, f, indent=4, ensure_ascii=False)
        
    print(f"\n[+] -> El reporte detallado de esta solicitud se guardó en: {ruta_archivo_salida}")

if __name__ == "__main__":
    # Ruta del modelo guardado por 2-pyspark_plata/lsh2.py en formato JSON
    ruta_modelo = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '2-pyspark_plata', 'lsh_params.json')
    
    try:
        print("Cargando parámetros LSH desde JSON (Media, Escala y Matriz R)...")
        with open(ruta_modelo, "r") as f:
            modelo = json.load(f)
            mean = np.array(modelo['scaler_mean'])
            scale = np.array(modelo['scaler_scale'])
            R = np.array(modelo['R'])
    except FileNotFoundError:
        print(f"❌ Error: No se encontró el archivo '{ruta_modelo}'.")
        print("¡Debes ejecutar 'python lsh2.py' primero en la otra carpeta para exportar los parámetros!")
        exit(1)

    # DATOS DE PRUEBA: 1 Solo Cliente
    # Vamos a probar con un cliente idéntico a uno real de nuestro Top 1 Peor Balde
    print("Creando solicitud de un nuevo cliente...")
    cliente_nuevo = pd.DataFrame([{
        'ingreso_mensual': 779.1237243732694,
        'score_crediticio': 381.75590408337064,
        'monto_solicitado': 14674.103725124027,
        'antiguedad_laboral_meses': 0,
        'deuda_actual': 5040.248954327027
    }])
    
    print("\nDatos de la solicitud:")
    print(cliente_nuevo.to_string(index=False))
    
    evaluar_cliente(cliente_nuevo, mean, scale, R)
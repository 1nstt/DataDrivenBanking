import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import time

# =========================================================
# FASE 1: CREACIÓN BIG DATA (1 Millón de Solicitudes)
# =========================================================
print("Generando base de datos histórica de 1.000.000 de clientes...")
start_time = time.time()
np.random.seed(42)

n_clientes = 1000000
# Ampliamos el anillo de fraude a 1.000 estafadores para que tenga peso estadístico
n_fraudes = 1000

ingreso = np.random.normal(1500, 500, n_clientes)
score_crediticio = np.random.normal(650, 100, n_clientes)
monto_solicitado = np.random.normal(3000, 1500, n_clientes)
antiguedad_laboral = np.random.poisson(36, n_clientes)
deuda_actual = np.random.normal(1000, 800, n_clientes)
es_fraude = np.zeros(n_clientes)

# Inyectamos el "Anillo de Fraude"
idx_fraude = np.random.choice(n_clientes, n_fraudes, replace=False)
ingreso[idx_fraude] = np.random.normal(800, 50, n_fraudes)
score_crediticio[idx_fraude] = np.random.normal(400, 20, n_fraudes)
monto_solicitado[idx_fraude] = np.random.normal(15000, 500, n_fraudes)
antiguedad_laboral[idx_fraude] = 0
deuda_actual[idx_fraude] = np.random.normal(5000, 200, n_fraudes)
es_fraude[idx_fraude] = 1

df = pd.DataFrame({
    'ingreso_mensual': ingreso,
    'score_crediticio': score_crediticio,
    'monto_solicitado': monto_solicitado,
    'antiguedad_laboral_meses': antiguedad_laboral,
    'deuda_actual': deuda_actual,
    'es_fraude': es_fraude
})

# =========================================================
# FASE 2: PREPROCESAMIENTO Y LSH OPTIMIZADO
# =========================================================
df_features = df.drop(columns=['es_fraude'])

scaler = StandardScaler()
matriz_escalada = scaler.fit_transform(df_features)

# Configuración LSH para 1 Millón (K=16 es el punto dulce)
K = 16 
R = np.random.randn(K, matriz_escalada.shape[1]) 

import json
import os
print("Guardando parámetros del modelo LSH (medias del scaler y matriz R) en JSON...")
parametros_lsh = {
    'scaler_mean': scaler.mean_.tolist(),
    'scaler_scale': scaler.scale_.tolist(),
    'R': R.tolist()
}
ruta_json = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lsh_params.json")
with open(ruta_json, "w") as f:
    json.dump(parametros_lsh, f)

print("Calculando firmas LSH mediante Vectorización Matricial...")
# ¡MAGIA DE ÁLGEBRA LINEAL! Multiplicamos 1 millón de filas de golpe (Sin bucles)
proyecciones = matriz_escalada @ R.T
bits = (proyecciones >= 0).astype(int).astype(str)

# Unimos las columnas de bits en un solo string por fila
df['firma_lsh'] = [''.join(fila) for fila in bits]

# =========================================================
# FASE 3: REPORTE DE RIESGO
# =========================================================
print("\n--- ANÁLISIS DE BALDES Y PROBABILIDAD DE FRAUDE ---")
resumen_baldes = df.groupby('firma_lsh').agg(
    total_solicitudes=('es_fraude', 'count'),
    fraudes_detectados=('es_fraude', 'sum')
).reset_index()

# Calculamos la Frecuencia Relativa (Risk Score)
resumen_baldes['probabilidad_fraude_%'] = (resumen_baldes['fraudes_detectados'] / resumen_baldes['total_solicitudes']) * 100

end_time = time.time()

print(f"Total solicitudes procesadas: {len(df):,}")
print(f"Total baldes (firmas) creados: {len(resumen_baldes):,}")
print(f"Tiempo total de procesamiento: {end_time - start_time:.2f} segundos\n")

print("TOP 5 BALDES DE ALTO RIESGO (Acción automática del Motor Low-Code):")
baldes_peligrosos = resumen_baldes[resumen_baldes['fraudes_detectados'] > 0].sort_values(by='probabilidad_fraude_%', ascending=False)
print(baldes_peligrosos.head(5).round(2).to_string(index=False))

# =========================================================
# FASE 4: GUARDAR RESULTADOS EN MONGODB
# =========================================================
import os
from pymongo import MongoClient

print("\n--- FAUSA 4: GUARDADO EN MONGODB ---")
print("Conectando a MongoDB para guardar los resultados (incluyendo la firma y etiqueta 'es_fraude')...")

# Usamos la misma configuración y variables de entorno que tu script load_to_mongodb.py
MONGO_HOST = os.getenv("MONGO_HOST", "mongodb") # Asumiendo localhost si corres fuera de container, o "mongodb" si en Docker
MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "password")
MONGO_DB = os.getenv("MONGO_DB", "bank_db")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "clientes_lsh")

connection_string = f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/"

try:
    client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print(f"✓ Conexión exitosa a Mongo ({MONGO_HOST}:{MONGO_PORT})")
    
    db = client[MONGO_DB]
    collection = db[MONGO_COLLECTION]
    
    # Se recomienda vaciar la colección si vas a correr esto múltiples veces
    # collection.delete_many({})
    
    print("Convirtiendo DataFrame a formato JSON/diccionarios...")
    # Convierte el Pandas DataFrame directamente en una lista de diccionarios con records
    datos_a_insertar = df.to_dict(orient="records")
    
    # Para 1 Millón de datos, la inserción masiva en lotes evita la saturación de memoria
    batch_size = 50000
    print(f"Iniciando inserción de {len(datos_a_insertar):,} documentos en la colección '{MONGO_COLLECTION}' (en lotes de {batch_size})...")
    
    for i in range(0, len(datos_a_insertar), batch_size):
        lote = datos_a_insertar[i:i + batch_size]
        collection.insert_many(lote)
        print(f"  -> Se han guardado {i + len(lote):,} de {len(datos_a_insertar):,} registros...")
        
    print("\n✓ ¡Todos los datos junto con sus firmas LSH y estado de fraude fueron guardados correctamente!")
    
except Exception as e:
    print(f"\n✗ Ocurrió un error al guardar en MongoDB: {e}")
finally:
    if 'client' in locals():
        client.close()
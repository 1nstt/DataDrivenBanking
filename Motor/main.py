import pandas as pd
import numpy as np
import os
import json
from pymongo import MongoClient

# =========================================================
# CONFIGURACIÓN DE MONGODB
# =========================================================
MONGO_HOST = os.getenv("MONGO_HOST", "mongodb") # Si corres en local sin docker usa "localhost"
MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "password")
MONGO_DB = os.getenv("MONGO_DB", "bank_db")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "clientes_lsh")

connection_string = f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/"
client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)

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
    resultados = list(collection.aggregate(pipeline))
    
    if not resultados:
        print("\n--- REPORTE DE RIESGO ---")
        print("El cliente pertenece a un balde nuevo sin historial.")
        print("Riesgo desconocido. -> DECISIÓN AUTOMÁTICA: REVISIÓN MANUAL")
        return
        
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
    
    print("\n[+] EJECUCIÓN DE REGLAS LOW-CODE:")
    if porcentaje_fraude >= 15.0:
        print("-> ACCIÓN AUTOMÁTICA: 🔴 ALERTA ROJA (Rechazar Solicitud / Bloquear)")
    elif porcentaje_fraude >= 2.0:
        print("-> ACCIÓN AUTOMÁTICA: 🟡 ALERTA AMARILLA (Pasar a revisión manual exhaustiva)")
    else:
        print("-> ACCIÓN AUTOMÁTICA: 🟢 ALERTA VERDE (Aprobar Solicitud)")

if __name__ == "__main__":
    # Ruta del modelo guardado por golden-to-service/lsh2.py en formato JSON
    ruta_modelo = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'golden-to-service', 'lsh_params.json')
    
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
    # Vamos a simular un cliente con características atípicas (Parecido a los estafadores generados en lsh2.py)
    print("Creando solicitud de un nuevo cliente...")
    cliente_nuevo = pd.DataFrame([{
        'ingreso_mensual': 820.0,
        'score_crediticio': 405.0,
        'monto_solicitado': 14900.0,
        'antiguedad_laboral_meses': 0,
        'deuda_actual': 5100.0
    }])
    
    print("\nDatos de la solicitud:")
    print(cliente_nuevo.to_string(index=False))
    
    evaluar_cliente(cliente_nuevo, mean, scale, R)
import os
import json
import random

# Definir la ruta de destino dentro de 5-API_MOTOR
OUTPUT_DIR = os.path.join(os.getcwd(), "clientes_historicos")

def generar_dataset_historico(n=10000):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"🚀 Iniciando la generación de {n} clientes en: {OUTPUT_DIR}")
    
    for i in range(1, n + 1):
        # Distribución de perfiles para simular datos reales
        perfil = random.choice(['saludable', 'ajustado', 'sobreendeudado', 'mixto'])
        
        if perfil == 'saludable':
            ingreso = round(random.uniform(1200000, 4500000), 2)
            deuda = round(random.uniform(0, ingreso * 0.20), 2)
            score = round(random.uniform(650, 850), 2)
            antiguedad = random.randint(12, 120)
            monto = round(random.uniform(500000, 10000000), 2)
        elif perfil == 'ajustado':
            ingreso = round(random.uniform(800000, 2000000), 2)
            deuda = round(random.uniform(ingreso * 0.31, ingreso * 0.44), 2)
            score = round(random.uniform(500, 680), 2)
            antiguedad = random.randint(6, 23)
            monto = round(random.uniform(1000000, 5000000), 2)
        elif perfil == 'sobreendeudado':
            ingreso = round(random.uniform(500000, 1500000), 2)
            deuda = round(random.uniform(ingreso * 0.46, ingreso * 1.5), 2)
            score = round(random.uniform(300, 520), 2)
            antiguedad = random.randint(0, 5)
            monto = round(random.uniform(3000000, 15000000), 2)
        else:
            ingreso = round(random.uniform(400000, 6000000), 2)
            deuda = round(random.uniform(0, 4000000), 2)
            score = round(random.uniform(300, 850), 2)
            antiguedad = random.randint(0, 150)
            monto = round(random.uniform(100000, 20000000), 2)

        # Construcción exacta respetando el formato SolicitudWrapper esperado por la API
        payload_solicitud = {
            "solicitud": {
                "ingreso_mensual": ingreso,
                "score_crediticio": score,
                "monto_solicitado": monto,
                "antiguedad_laboral_meses": antiguedad,
                "deuda_actual": deuda
            }
        }
        
        # Guardar archivo individual indexado
        file_path = os.path.join(OUTPUT_DIR, f"cliente_hist_{i}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(payload_solicitud, f, indent=4, ensure_ascii=False)
            
    print(f"✅ ¡Proceso completado con éxito! 10,000 JSON creados en {OUTPUT_DIR}")

if __name__ == "__main__":
    generar_dataset_historico(10000)
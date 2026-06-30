import os
import json
import random
from fastapi import FastAPI, HTTPException, status
from app.database import get_collection

# --- Importaciones de tus módulos de lógica e inferencia ---
from app.etiquetas import SolicitudWrapper, DatosSolicitud, evaluar_y_etiquetar
from app.xgboost import predecir_etiqueta_xgb
from app.is_aprobado import evaluar_aprobacion 

COLLECTION_NAME = "historial_solicitudes_p0"

app = FastAPI(
    title="API Motor - Evaluación de Solicitudes",
    description="API nueva para la capa de consumo de datos, inferencia de modelos y decisión",
    version="1.0.0"
)


@app.get("/")
async def health_check():
    return {
        "status": "online",
        "modulo": "5-API_MOTOR",
        "database_target": os.getenv("MONGO_DB", "bank_db"),
        "collection_target": COLLECTION_NAME
    }


@app.get("/solicitudes", status_code=status.HTTP_200_OK)
async def listar_solicitudes(limit: int = 50):
    try:
        collection = get_collection(COLLECTION_NAME)
        resultados = []
        
        cursor = collection.find({}).sort("_id", -1).limit(limit)
        async for document in cursor:
            document["_id"] = str(document["_id"])
            resultados.append(document)
            
        return {
            "status": "success",
            "origen": COLLECTION_NAME,
            "count": len(resultados), 
            "data": resultados
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al consultar el historial en MongoDB: {str(e)}"
        )


@app.post("/evaluar_p0", status_code=status.HTTP_201_CREATED)
async def evaluar_p0(payload: SolicitudWrapper):
    try:
        # --- FASE 1: Extracción de datos ---
        datos_solicitud = payload.solicitud
        
        # --- FASE 2: Proceso de Etiquetado por Reglas ---
        resultado_etiquetas = evaluar_y_etiquetar(datos_solicitud)
        
        # --- FASE 3: Inferencia con Modelo ML XGBoost (.pkl) ---
        etiqueta_ml = predecir_etiqueta_xgb(datos_solicitud)
        resultado_etiquetas["prediccion_xgboost"] = etiqueta_ml
        
        # --- FASE 4: Decisión Final del Negocio ---
        decision_final = evaluar_aprobacion(etiqueta_ml)
        
        # --- FASE 5: Consolidación del Documento ---
        documento_final = {
            "solicitud": datos_solicitud.model_dump(),
            "etiquetas": resultado_etiquetas,
            "resultado_final": decision_final,
            "flujo_estado": "p0_completado"
        }
        
        # --- FASE 6: Persistencia en la Base de Datos ---
        collection = get_collection(COLLECTION_NAME)
        insert_result = await collection.insert_one(documento_final)
        documento_final["_id"] = str(insert_result.inserted_id)
        
        # --- FASE 7: Guardar archivo físico en la carpeta 'output' ---
        output_dir = os.path.join(os.getcwd(), "output")
        os.makedirs(output_dir, exist_ok=True)
        
        #file_path = os.path.join(output_dir, f"solicitud_{documento_final['_id']}.json")
        #with open(file_path, "w", encoding="utf-8") as f:
        #    json.dump(documento_final, f, indent=4, ensure_ascii=False)
        
        return {
            "status": "success",
            "fase_actual": "p0",
        #    "archivo_guardado": f"output/solicitud_{documento_final['_id']}.json",
            "documento": documento_final
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el flujo: {str(e)}"
        )


# --- NUEVO ENDPOINT OPTIMIZADO: Genera 10k clientes en memoria, los procesa y los inyecta en lote a Mongo ---
@app.post("/procesar_historico", status_code=status.HTTP_200_OK)
async def procesar_historico(cantidad: int = 10000):
    try:
        collection = get_collection(COLLECTION_NAME)
        documentos_a_insertar = []
        
        for _ in range(cantidad):
            # 1. Generar perfil aleatorio en caliente
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

            # Instanciar el objeto Pydantic para asegurar que la estructura cumpla las reglas del motor
            datos_solicitud = DatosSolicitud(
                ingreso_mensual=ingreso,
                score_crediticio=score,
                monto_solicitado=monto,
                antiguedad_laboral_meses=antiguedad,
                deuda_actual=deuda
            )
            
            # 2. Correr las fases de analítica del motor directamente en memoria
            resultado_etiquetas = evaluar_y_etiquetar(datos_solicitud)
            etiqueta_ml = predecir_etiqueta_xgb(datos_solicitud)
            resultado_etiquetas["prediccion_xgboost"] = etiqueta_ml
            decision_final = evaluar_aprobacion(etiqueta_ml)
            
            # 3. Consolidar el documento estructurado
            doc = {
                "solicitud": datos_solicitud.model_dump(),
                "etiquetas": resultado_etiquetas,
                "resultado_final": decision_final,
                "flujo_estado": "p0_completado"
            }
            documentos_a_insertar.append(doc)
            
        # 4. Inserción masiva en lote (Bulk Insert) en MongoDB. ¡Esto vuela!
        if documentos_a_insertar:
            insert_result = await collection.insert_many(documentos_a_insertar)
            total_insertados = len(insert_result.inserted_ids)
        else:
            total_insertados = 0
            
        return {
            "status": "completado",
            "msg": "Generación y evaluación masiva ejecutada con éxito directamente en memoria.",
            "total_procesados_e_insertados": total_insertados,
            "destino_base_datos": COLLECTION_NAME
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en la generación masiva: {str(e)}"
        )
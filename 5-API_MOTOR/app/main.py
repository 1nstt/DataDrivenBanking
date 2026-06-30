import os
import json
from fastapi import FastAPI, HTTPException, status
from app.database import get_collection

# --- Importaciones de tus módulos de lógica e inferencia ---
from app.etiquetas import SolicitudWrapper, evaluar_y_etiquetar
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


@app.get("/solicitudes")
async def listar_solicitudes(limit: int = 50):
    try:
        collection = get_collection(COLLECTION_NAME)
        resultados = []
        
        cursor = collection.find({}).limit(limit)
        async for document in cursor:
            document["_id"] = str(document["_id"])
            resultados.append(document)
            
        return {"count": len(resultados), "data": resultados}
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al consultar la base de datos: {str(e)}"
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
        # Levantará dinámicamente 'historial_solicitudes_p0' a través de database.py
        collection = get_collection(COLLECTION_NAME)
        insert_result = await collection.insert_one(documento_final)
        documento_final["_id"] = str(insert_result.inserted_id)
        
        # --- FASE 7: Guardar archivo físico en la carpeta 'output' ---
        output_dir = os.path.join(os.getcwd(), "output")
        os.makedirs(output_dir, exist_ok=True)
        
        file_path = os.path.join(output_dir, f"solicitud_{documento_final['_id']}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(documento_final, f, indent=4, ensure_ascii=False)
        
        return {
            "status": "success",
            "fase_actual": "p0",
            "archivo_guardado": f"output/solicitud_{documento_final['_id']}.json",
            "documento": documento_final
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el flujo: {str(e)}"
        )
import os
import pickle
import xgboost as xgb
from app.etiquetas import DatosSolicitud

# Definir la ruta apuntando a tu archivo .pkl
MODEL_PATH = os.path.join(os.getcwd(), "models", "modelo_xgb.pkl")

_modelo_cargado = None

def cargar_modelo():
    global _modelo_cargado
    if _modelo_cargado is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"No se encontró el archivo del modelo en: {MODEL_PATH}")
        
        # Abrir y cargar el archivo serializado con pickle
        with open(MODEL_PATH, "rb") as f:
            _modelo_cargado = pickle.load(f)
            
    return _modelo_cargado

def predecir_etiqueta_xgb(datos: DatosSolicitud) -> str:
    """
    Toma los datos de la solicitud, ejecuta la inferencia en el .pkl
    y retorna únicamente el porcentaje (%) de riesgo estimado.
    """
    model = cargar_modelo()
    
    # 1. Armar las características en el orden idéntico al entrenamiento
    features = [
        datos.ingreso_mensual,
        datos.score_crediticio,
        datos.monto_solicitado,
        datos.antiguedad_laboral_meses,
        datos.deuda_actual
    ]
    
    try:
        # Formato Sklearn API: XGBClassifier
        prediccion_proba = model.predict_proba([features])
        probabilidad = float(prediccion_proba[0][1])  # Probabilidad de la clase 1
    except AttributeError:
        # Formato API nativa (xgb.train)
        data_matrix = xgb.DMatrix([features])
        prediccion = model.predict(data_matrix)
        probabilidad = float(prediccion[0])

    # 2. Transformar la probabilidad a formato porcentaje entero (ej: 0.354 -> 35%)
    porcentaje_riesgo = round(probabilidad * 100)
    
    return f"{porcentaje_riesgo}%"
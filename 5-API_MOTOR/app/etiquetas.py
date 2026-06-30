from pydantic import BaseModel, Field

# --- Modelos de Entrada de Datos (Pydantic) ---

class DatosSolicitud(BaseModel):
    ingreso_mensual: float = Field(..., gt=0)
    score_crediticio: float = Field(..., ge=300, le=850)  # Soportando float de Pandas
    monto_solicitado: float = Field(..., gt=0)
    antiguedad_laboral_meses: int = Field(..., ge=0)
    deuda_actual: float = Field(..., ge=0)

class SolicitudWrapper(BaseModel):
    solicitud: DatosSolicitud


# --- Motor de Reglas / Etiquetado ---

def evaluar_y_etiquetar(datos: DatosSolicitud) -> dict:
    """
    Analiza la solicitud financiera sin tocar perfiles de riesgo, 
    enfocándose en capacidad de pago y solidez financiera.
    """
    etiquetas = {}
    
    # 1. Razón de endeudamiento básico: (Deuda Actual / Ingreso Mensual)
    capacidad_endeudamiento = (datos.deuda_actual / datos.ingreso_mensual) if datos.ingreso_mensual > 0 else 0.0
    etiquetas["ratio_endeudamiento_actual"] = round(capacidad_endeudamiento, 2)
    
    if capacidad_endeudamiento > 0.45:
        etiquetas["capacidad_pago"] = "Sobreendeudado"
    elif capacidad_endeudamiento > 0.30:
        etiquetas["capacidad_pago"] = "Ajustada"
    else:
        etiquetas["capacidad_pago"] = "Saludable"

    # 2. Estabilidad Laboral
    if datos.antiguedad_laboral_meses >= 12:
        etiquetas["estabilidad_laboral"] = "Alta"
    elif datos.antiguedad_laboral_meses >= 6:
        etiquetas["estabilidad_laboral"] = "Media"
    else:
        etiquetas["estabilidad_laboral"] = "Inestable"

    # 3. Nueva Etiqueta: Score de Estabilidad Financiera (Reemplaza a Perfil Riesgo)
    # Cruza la antigüedad con su ratio de deuda actual
    if etiquetas["estabilidad_laboral"] == "Alta" and etiquetas["capacidad_pago"] == "Saludable":
        etiquetas["score_estabilidad_financiera"] = "Consolidado"
    elif etiquetas["estabilidad_laboral"] in ["Alta", "Media"] and etiquetas["capacidad_pago"] != "Sobreendeudado":
        etiquetas["score_estabilidad_financiera"] = "Estable"
    elif etiquetas["capacidad_pago"] == "Sobreendeudado":
        etiquetas["score_estabilidad_financiera"] = "Critico"
    else:
        etiquetas["score_estabilidad_financiera"] = "Vulnerable"

    # 4. Decisión de Motor Preliminar basada en estas nuevas métricas
    if etiquetas["score_estabilidad_financiera"] == "Critico":
        etiquetas["decision_preliminar"] = "Mal prospecto"
    elif etiquetas["score_estabilidad_financiera"] == "Consolidado":
        etiquetas["decision_preliminar"] = "Prospecto consolidado"
    else:
        etiquetas["decision_preliminar"] = "Prospecto indefinido"

    return etiquetas
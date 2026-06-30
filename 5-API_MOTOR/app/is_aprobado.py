def evaluar_aprobacion(prediccion_xgb_str: str) -> str:
    """
    Toma el string de riesgo (ej: '35%'), extrae el valor numérico
    y aplica la regla de negocio: >= 40% RECHAZADO, < 40% APROBADO.
    """
    try:
        # Limpiar el string eliminando el símbolo '%' y convertir a entero
        porcentaje_riesgo = int(prediccion_xgb_str.replace("%", "").strip())
        
        # Aplicar la regla de negocio (40% o superior se rechaza)
        if porcentaje_riesgo >= 40:
            return "RECHAZADO"
        else:
            return "APROBADO"
            
    except Exception as e:
        # En caso de que el formato del string falle, por seguridad dejamos el estado bajo revisión
        return f"ERROR_EVALUACION: {str(e)}"
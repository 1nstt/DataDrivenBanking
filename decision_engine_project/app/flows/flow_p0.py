from app.models.solicitud import SolicitudMotor
from app.library.calculations import income
from app.library.rulesets import hard_rules

def run_flow(motor: SolicitudMotor):
    """
    Flujo P0: Evaluación rápida inicial.
    1. Calcula Renta.
    2. Si tiene Renta > 0, revisa Dicom y Ratio Arriendo.
    """
    
    # --- 1. Cálculos ---
    income.fn_calcular_promedio_renta(motor)

    # --- 2. Reglas de Negocio ---
    titular = motor.titular
    
    if titular and titular.calculated_metrics.income.avg_6m > 0:
        hard_rules.rl_check_dicom(motor)
        hard_rules.rl_renta_minima(motor)
    else:
        hard_rules.rl_sin_ingresos(motor)
    
    # --- 3. Finalizar Decisión ---
    motor.finalize_decision()
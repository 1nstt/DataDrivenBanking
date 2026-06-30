# Hard rules
from app.models.solicitud import SolicitudMotor
from app.core.decorators import track_execution

@track_execution
def rl_renta_minima(motor: SolicitudMotor):
    """Regla: La renta del titular debe ser al menos 3 veces el arriendo."""
    
   
    
    titular = motor.titular
    if not titular:
        motor.reject_request("RL_NO_TITULAR", "No existe titular")
        return

    renta = titular.calculated_metrics.income.avg_6m
    arriendo = motor.context.monthly_rent
    factor = 3.0

    if renta < (arriendo * factor):
        motor.reject_request(
            rule_code="RL_RENTA_INSUFICIENTE",
            reason=f"Renta ({renta}) inferior a {factor}x el arriendo ({arriendo})"
        )
    else:
        titular.evaluation_results.income.evaluation_code = "APPROVED"

@track_execution
def rl_check_dicom(motor: SolicitudMotor):
    """Regla: Rechazo inmediato si hay deuda dura en DICOM."""
    
   
    
    for app in motor.applicants:
        if app.commercial_data.dicom and app.commercial_data.dicom.is_hard_debt:
            motor.reject_request(
                rule_code="RL_DICOM_HARD",
                reason=f"Aplicante {app.id} tiene antecedentes comerciales bloqueantes."
            )

@track_execution
def rl_sin_ingresos(motor: SolicitudMotor):
    """Regla: Rechazo si no se detectan ingresos válidos en el titular."""

  

    titular = motor.titular
    if not titular:
        motor.reject_request("RL_NO_TITULAR", "No existe titular")
        return

    renta = titular.calculated_metrics.income.avg_6m
    if renta <= 0:
        motor.reject_request(
            rule_code="RL_SIN_INGRESOS",
            reason="No se detectaron ingresos válidos."
        )
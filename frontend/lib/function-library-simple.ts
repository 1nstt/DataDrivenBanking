import type { FunctionDefinition } from "./function-store"

export const functionLibrary: FunctionDefinition[] = [
  {
    id: "fn_calcular_promedio_renta",
    name: "fn_calcular_promedio_renta",
    category: "calculations",
    description: "Calcula el promedio de renta del titular dependiente.",
    code: `from app.models.solicitud import SolicitudMotor
from app.core.decorators import track_execution


@track_execution
def fn_calcular_promedio_renta(motor: SolicitudMotor):
    for app in motor.applicants:
        if app.is_dependent:
            payslips = app.income_source.dependent.payslips
            if payslips:
                total = sum(p.net_income for p in payslips)
                avg = total / len(payslips)
                app.calculated_metrics.income.avg_6m = avg
                motor.add_observation("fn_calc_renta", f"Promedio calculado App {app.id}", avg)
            else:
                app.calculated_metrics.income.avg_6m = 0.0`,
    updatedAt: new Date(),
  },
  {
    id: "rl_check_dicom",
    name: "rl_check_dicom",
    category: "rulesets",
    description: "Rechaza si existe deuda dura en DICOM.",
    code: `from app.models.solicitud import SolicitudMotor
from app.core.decorators import track_execution


@track_execution
def rl_check_dicom(motor: SolicitudMotor):
    for app in motor.applicants:
        if app.commercial_data.dicom and app.commercial_data.dicom.is_hard_debt:
            motor.reject_request(
                rule_code="RL_DICOM_HARD",
                reason=f"Aplicante {app.id} tiene antecedentes comerciales bloqueantes.",
            )`,
    updatedAt: new Date(),
  },
  {
    id: "rl_renta_minima",
    name: "rl_renta_minima",
    category: "rulesets",
    description: "Verifica que la renta cubra 3 veces el arriendo.",
    code: `from app.models.solicitud import SolicitudMotor
from app.core.decorators import track_execution


@track_execution
def rl_renta_minima(motor: SolicitudMotor):
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
            reason=f"Renta ({renta}) inferior a {factor}x el arriendo ({arriendo})",
        )
    else:
        titular.evaluation_results.income.evaluation_code = "APPROVED"`,
    updatedAt: new Date(),
  },
  {
    id: "rl_sin_ingresos",
    name: "rl_sin_ingresos",
    category: "rulesets",
    description: "Rechaza cuando el titular no tiene ingresos válidos.",
    code: `from app.models.solicitud import SolicitudMotor
from app.core.decorators import track_execution


@track_execution
def rl_sin_ingresos(motor: SolicitudMotor):
    titular = motor.titular
    if not titular:
        motor.reject_request("RL_NO_TITULAR", "No existe titular")
        return

    renta = titular.calculated_metrics.income.avg_6m
    if renta <= 0:
        motor.reject_request(
            rule_code="RL_SIN_INGRESOS",
            reason="No se detectaron ingresos válidos.",
        )`,
    updatedAt: new Date(),
  },
  {
    id: "motor.finalize_decision",
    name: "motor.finalize_decision",
    category: "engine",
    description: "Cierra la decisión final del motor.",
    code: `def finalize_decision(motor):
    motor.finalize_decision()`,
    updatedAt: new Date(),
  },
]
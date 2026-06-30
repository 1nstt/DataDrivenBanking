import functools
import json
import copy
from datetime import datetime
from app.models.solicitud import SolicitudMotor

def track_execution(fn):
    """
    Decorador que captura inputs y outputs de funciones fn_* y rl_*.
    
    Registra en motor.fn_history:
    - execution_id único
    - fn_name
    - executed_at (timestamp)
    - inputs: parámetros capturados
    - outputs: cambios en el objeto motor
    """
    @functools.wraps(fn)
    def wrapper(motor: SolicitudMotor, *args, **kwargs):
        # 1. Capturar estado ANTES (snapshot)
        state_before = _take_snapshot(motor)
        
        # 2. Ejecutar la función
        result = fn(motor, *args, **kwargs)
        
        # 3. Capturar estado DESPUÉS
        state_after = _take_snapshot(motor)
        
        # 4. Calcular deltas (cambios)
        inputs = _extract_inputs(fn, motor, args, kwargs)
        outputs = _calculate_deltas(state_before, state_after)
        
        # 5. Registrar en fn_history
        from app.models.solicitud import FnHistory
        
        execution_record = FnHistory(
            execution_id=f"exec-{len(motor.fn_history)+1}",
            fn_name=fn.__name__,
            executed_at=datetime.now().isoformat()
        )
        
        # Convertir a dict y agregar inputs/outputs si no están en FnHistory
        record_dict = {
            "execution_id": execution_record.execution_id,
            "fn_name": execution_record.fn_name,
            "executed_at": execution_record.executed_at,
            "inputs": inputs,
            "outputs": outputs
        }
        
        # Guardar como dict en la historia (lo convertiremos al serializar)
        motor.fn_history.append(record_dict)
        
        return result
    
    return wrapper


def _take_snapshot(motor: SolicitudMotor) -> dict:
    """Toma un snapshot del estado actual del motor (sin circular references)."""
    snapshot = {
        "applicants": []
    }
    
    for app in motor.applicants:
        app_snap = {
            "id": app.id,
            "calculated_metrics": {
                "income": {
                    "avg_6m": app.calculated_metrics.income.avg_6m,
                    "avg_12m": getattr(app.calculated_metrics.income, "avg_12m", 0),
                    "min_month": getattr(app.calculated_metrics.income, "min_month", 0),
                    "variability_index": getattr(app.calculated_metrics.income, "variability_index", 0),
                },
                "financial_load": {
                    "debt_to_income_ratio": app.calculated_metrics.financial_load.debt_to_income_ratio,
                    "available_income_after_debt": getattr(app.calculated_metrics.financial_load, "available_income_after_debt", 0),
                }
            },
            "evaluation_results": {
                "income": {
                    "evaluation_code": app.evaluation_results.income.evaluation_code,
                    "triggered_rule_codes": list(app.evaluation_results.income.triggered_rule_codes),
                }
            }
        }
        snapshot["applicants"].append(app_snap)
    
    snapshot["decision"] = {
        "final_decision_code": motor.decision.final_decision_code,
        "blocking_rule_codes": list(motor.decision.blocking_rule_codes),
        "required_action_codes": list(motor.decision.required_action_codes),
    }
    
    return snapshot


def _calculate_deltas(state_before: dict, state_after: dict) -> list:
    """Calcula los cambios (deltas) entre dos estados."""
    outputs = []
    
    # Comparar decision
    if state_before["decision"] != state_after["decision"]:
        outputs.append({
            "path": "decision",
            "value_type": "object",
            "value": state_after["decision"]
        })
    
    # Comparar aplicantes
    for i, app_before in enumerate(state_before.get("applicants", [])):
        if i < len(state_after.get("applicants", [])):
            app_after = state_after["applicants"][i]
            
            # Cambios en calculated_metrics
            if app_before.get("calculated_metrics") != app_after.get("calculated_metrics"):
                outputs.append({
                    "path": f"applicants[{i}].calculated_metrics",
                    "value_type": "object",
                    "value": app_after.get("calculated_metrics")
                })
            
            # Cambios en evaluation_results
            if app_before.get("evaluation_results") != app_after.get("evaluation_results"):
                outputs.append({
                    "path": f"applicants[{i}].evaluation_results",
                    "value_type": "object",
                    "value": app_after.get("evaluation_results")
                })
    
    return outputs


def _extract_inputs(fn, motor: SolicitudMotor, args: tuple, kwargs: dict) -> list:
    """Extrae los inputs de la función (solo lo relevante del motor)."""
    inputs = []
    
    # Siempre registramos que motor es el primer argumento
    inputs.append({
        "path": "motor",
        "value_type": "SolicitudMotor",
        "value": f"SolicitudMotor(id={motor.id}, applicants={len(motor.applicants)})"
    })
    
    # Registrar args adicionales
    for i, arg in enumerate(args):
        inputs.append({
            "path": f"arg_{i}",
            "value_type": type(arg).__name__,
            "value": str(arg)
        })
    
    # Registrar kwargs
    for key, value in kwargs.items():
        inputs.append({
            "path": f"kwarg_{key}",
            "value_type": type(value).__name__,
            "value": str(value)
        })
    
    return inputs

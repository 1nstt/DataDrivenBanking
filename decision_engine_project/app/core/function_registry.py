from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from threading import Lock
from typing import Any, Callable, Dict, List, Optional

from app.models.solicitud import SolicitudMotor


CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "functions.json"
_LOCK = Lock()


DEFAULT_FUNCTIONS: List[Dict[str, Any]] = [
    {
        "name": "fn_calcular_promedio_renta",
        "label": "Calcular promedio de renta",
        "category": "calculations",
        "description": "Calcula el promedio de los ingresos del titular dependiente.",
        "code": "from app.models.solicitud import SolicitudMotor\nfrom app.core.decorators import track_execution\n\n\n@track_execution\ndef fn_calcular_promedio_renta(motor: SolicitudMotor):\n    for app in motor.applicants:\n        if app.is_dependent:\n            payslips = app.income_source.dependent.payslips\n            if payslips:\n                total = sum(p.net_income for p in payslips)\n                avg = total / len(payslips)\n                app.calculated_metrics.income.avg_6m = avg\n                motor.add_observation(\"fn_calc_renta\", f\"Promedio calculado App {app.id}\", avg)\n            else:\n                app.calculated_metrics.income.avg_6m = 0.0",
    },
    {
        "name": "rl_check_dicom",
        "label": "Validar DICOM duro",
        "category": "rulesets",
        "description": "Rechaza la solicitud si existe deuda dura en DICOM.",
        "code": "from app.models.solicitud import SolicitudMotor\nfrom app.core.decorators import track_execution\n\n\n@track_execution\ndef rl_check_dicom(motor: SolicitudMotor):\n    for app in motor.applicants:\n        if app.commercial_data.dicom and app.commercial_data.dicom.is_hard_debt:\n            motor.reject_request(\n                rule_code=\"RL_DICOM_HARD\",\n                reason=f\"Aplicante {app.id} tiene antecedentes comerciales bloqueantes.\",\n            )",
    },
    {
        "name": "rl_renta_minima",
        "label": "Validar renta mínima",
        "category": "rulesets",
        "description": "Rechaza si la renta no supera 3 veces el arriendo.",
        "code": "from app.models.solicitud import SolicitudMotor\nfrom app.core.decorators import track_execution\n\n\n@track_execution\ndef rl_renta_minima(motor: SolicitudMotor):\n    titular = motor.titular\n    if not titular:\n        motor.reject_request(\"RL_NO_TITULAR\", \"No existe titular\")\n        return\n\n    renta = titular.calculated_metrics.income.avg_6m\n    arriendo = motor.context.monthly_rent\n    factor = 3.0\n\n    if renta < (arriendo * factor):\n        motor.reject_request(\n            rule_code=\"RL_RENTA_INSUFICIENTE\",\n            reason=f\"Renta ({renta}) inferior a {factor}x el arriendo ({arriendo})\",\n        )\n    else:\n        titular.evaluation_results.income.evaluation_code = \"APPROVED\"",
    },
    {
        "name": "rl_sin_ingresos",
        "label": "Validar ingresos",
        "category": "rulesets",
        "description": "Rechaza si no se detectan ingresos válidos.",
        "code": "from app.models.solicitud import SolicitudMotor\nfrom app.core.decorators import track_execution\n\n\n@track_execution\ndef rl_sin_ingresos(motor: SolicitudMotor):\n    titular = motor.titular\n    if not titular:\n        motor.reject_request(\"RL_NO_TITULAR\", \"No existe titular\")\n        return\n\n    renta = titular.calculated_metrics.income.avg_6m\n    if renta <= 0:\n        motor.reject_request(\n            rule_code=\"RL_SIN_INGRESOS\",\n            reason=\"No se detectaron ingresos válidos.\",\n        )",
    },
    {
        "name": "motor.finalize_decision",
        "label": "Finalizar decisión",
        "category": "engine",
        "description": "Cierra la decisión final del motor.",
        "code": "def finalize_decision(motor):\n    motor.finalize_decision()",
    },
]


def _ensure_store_file() -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if CONFIG_PATH.exists():
        return

    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump({"functions": deepcopy(DEFAULT_FUNCTIONS)}, f, indent=2, ensure_ascii=False)


def _load_store() -> Dict[str, Any]:
    _ensure_store_file()
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if "functions" not in data or not isinstance(data["functions"], list):
        data = {"functions": deepcopy(DEFAULT_FUNCTIONS)}

    return data


def _save_store(data: Dict[str, Any]) -> None:
    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _compile_callable(definition: Dict[str, Any]) -> Callable[[SolicitudMotor], None]:
    namespace: Dict[str, Any] = {"SolicitudMotor": SolicitudMotor}
    exec(definition["code"], namespace)
    runtime_name = definition["name"].split(".")[-1]
    fn = namespace.get(runtime_name)
    if not callable(fn):
        raise ValueError(f"No se pudo compilar la función: {definition['name']}")
    return fn


def _load_definitions() -> List[Dict[str, Any]]:
    store = _load_store()
    return store["functions"]


def list_functions() -> List[Dict[str, Any]]:
    return deepcopy(_load_definitions())


def get_function(function_name: str) -> Optional[Dict[str, Any]]:
    return next((deepcopy(fn) for fn in _load_definitions() if fn.get("name") == function_name), None)


def upsert_function(function_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    with _LOCK:
        store = _load_store()
        functions = store["functions"]
        normalized = deepcopy(payload)
        normalized["name"] = function_name
        normalized.setdefault("label", function_name)
        normalized.setdefault("category", "logic")
        normalized.setdefault("description", "")
        normalized.setdefault("code", "")

        for index, existing in enumerate(functions):
            if existing.get("name") == function_name:
                functions[index] = normalized
                _save_store(store)
                return deepcopy(normalized)

        functions.append(normalized)
        _save_store(store)
        return deepcopy(normalized)


def invoke(function_name: str, motor: SolicitudMotor):
    if function_name == "motor.finalize_decision":
        motor.finalize_decision()
        return None

    definition = get_function(function_name)
    if definition is None:
        raise ValueError(f"Función desconocida: {function_name}")

    fn = _compile_callable(definition)
    return fn(motor)
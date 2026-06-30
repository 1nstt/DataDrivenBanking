from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional


CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "flows.json"
_LOCK = Lock()


DEFAULT_FLOW = {
    "flow_name": "p0",
    "display_name": "P0",
    "description": "Flujo base de evaluación rápida inicial.",
    "entryNodeId": "n1",
    "nodes": [
        {
            "id": "n1",
            "type": "function",
            "data": {"functionName": "fn_calcular_promedio_renta", "status": "idle"},
        },
        {
            "id": "n2",
            "type": "decision",
            "data": {
                "condition": "titular and titular.calculated_metrics.income.avg_6m > 0",
                "status": "idle",
            },
        },
        {
            "id": "n3",
            "type": "function",
            "data": {"functionName": "rl_check_dicom", "status": "idle"},
        },
        {
            "id": "n4",
            "type": "function",
            "data": {"functionName": "rl_renta_minima", "status": "idle"},
        },
        {
            "id": "n5",
            "type": "function",
            "data": {"functionName": "rl_sin_ingresos", "status": "idle"},
        },
        {
            "id": "n6",
            "type": "function",
            "data": {"functionName": "motor.finalize_decision", "status": "idle"},
        },
    ],
    "edges": [
        {"id": "e1", "source": "n1", "target": "n2"},
        {"id": "e2", "source": "n2", "target": "n3", "sourceHandle": "true"},
        {"id": "e3", "source": "n2", "target": "n5", "sourceHandle": "false"},
        {"id": "e4", "source": "n3", "target": "n4"},
        {"id": "e5", "source": "n4", "target": "n6"},
        {"id": "e6", "source": "n5", "target": "n6"},
    ],
}


def _ensure_store_file() -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if CONFIG_PATH.exists():
        return

    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump({"flows": {"p0": deepcopy(DEFAULT_FLOW)}}, f, indent=2, ensure_ascii=False)


def _load_store() -> Dict[str, Any]:
    _ensure_store_file()
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if "flows" not in data or not isinstance(data["flows"], dict):
        data = {"flows": {"p0": deepcopy(DEFAULT_FLOW)}}

    if "p0" not in data["flows"]:
        data["flows"]["p0"] = deepcopy(DEFAULT_FLOW)

    return data


def _save_store(data: Dict[str, Any]) -> None:
    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def list_flows() -> List[Dict[str, Any]]:
    store = _load_store()
    return list(store["flows"].values())


def get_flow(flow_name: str) -> Optional[Dict[str, Any]]:
    store = _load_store()
    flow = store["flows"].get(flow_name)
    return deepcopy(flow) if flow else None


def upsert_flow(flow_name: str, flow_data: Dict[str, Any]) -> Dict[str, Any]:
    with _LOCK:
        store = _load_store()
        normalized = deepcopy(flow_data)
        normalized["flow_name"] = flow_name
        normalized.setdefault("display_name", flow_name)
        normalized.setdefault("description", "")
        normalized.setdefault("entryNodeId", None)
        normalized.setdefault("nodes", [])
        normalized.setdefault("edges", [])
        store["flows"][flow_name] = normalized
        _save_store(store)
        return deepcopy(normalized)


def delete_flow(flow_name: str) -> None:
    if flow_name == "p0":
        raise ValueError("No se puede eliminar el flujo base p0")

    with _LOCK:
        store = _load_store()
        if flow_name in store["flows"]:
            del store["flows"][flow_name]
            _save_store(store)
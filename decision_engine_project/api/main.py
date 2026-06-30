from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.flow_store import delete_flow, get_flow, list_flows, upsert_flow
from app.core.function_registry import get_function, list_functions, upsert_function
from app.engine import DecisionEngine

app = FastAPI(title="Decision Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FlowPayload(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    entryNodeId: Optional[str] = None
    nodes: list[Dict[str, Any]] = Field(default_factory=list)
    edges: list[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FunctionPayload(BaseModel):
    label: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    code: str


class ExecutePayload(BaseModel):
    solicitud: Dict[str, Any]
    flow_name: str = "p0"
    flow_code: Optional[str] = None


@app.get("/")
def root():
    return {
        "status": "ok",
        "flows": len(list_flows()),
        "functions": len(list_functions()),
    }


@app.get("/functions")
def read_functions():
    return {"functions": list_functions()}


@app.get("/functions/{function_name}")
def read_function(function_name: str):
    fn = get_function(function_name)
    if fn is None:
        raise HTTPException(status_code=404, detail=f"Función no encontrada: {function_name}")
    return fn


@app.put("/functions/{function_name}")
def save_function(function_name: str, payload: FunctionPayload):
    stored = upsert_function(function_name, payload.model_dump())
    return stored


@app.get("/flows")
def read_flows():
    return {"flows": list_flows()}


@app.get("/flows/{flow_name}")
def read_flow(flow_name: str):
    flow = get_flow(flow_name)
    if flow is None:
        raise HTTPException(status_code=404, detail=f"Flujo no encontrado: {flow_name}")
    return flow


@app.put("/flows/{flow_name}")
def save_flow(flow_name: str, payload: FlowPayload):
    stored = upsert_flow(flow_name, payload.model_dump())
    return stored


@app.delete("/flows/{flow_name}")
def remove_flow(flow_name: str):
    try:
        delete_flow(flow_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "deleted", "flow_name": flow_name}


@app.post("/execute")
def execute_request(payload: ExecutePayload):
    engine = DecisionEngine()
    return engine.execute(payload.solicitud, flow_name=payload.flow_name, flow_code=payload.flow_code)

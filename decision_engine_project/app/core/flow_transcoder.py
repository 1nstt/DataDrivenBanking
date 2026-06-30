"""
Transcoders between Python flow functions and a simple logical JSON plan.

Limitaciones: maneja flujos con pasos secuenciales y condicionales simples (if/else).
- Soporta llamadas a funciones (call).
- Soporta ramas if con then/else.
- No soporta bucles ni comprensiones.
"""
import ast
import inspect
from typing import Any, Dict, List, Callable

Plan = Dict[str, Any]

# --- Public API ---

def flow_to_json(flow_fn: Callable) -> Plan:
    """Convierte una función de flujo Python a un plan JSON simple."""
    source = inspect.getsource(flow_fn)
    tree = ast.parse(source)
    func_def = next((n for n in tree.body if isinstance(n, ast.FunctionDef)), None)
    if func_def is None:
        raise ValueError("No se encontró definición de función en el flujo dado")

    steps = [_node_to_step(stmt) for stmt in func_def.body if _node_to_step(stmt) is not None]
    return {
        "flow_name": flow_fn.__name__,
        "steps": steps
    }


def json_to_flow(plan: Plan, flow_name: str = None) -> str:
    """Genera código Python de un flujo a partir de un plan JSON."""
    name = flow_name or plan.get("flow_name", "run_flow")
    steps_code = _steps_to_code(plan.get("steps", []), indent=4)
    return """from app.models.solicitud import SolicitudMotor\n\n\ndef {name}(motor: SolicitudMotor):\n{steps}\n""".format(
        name=name,
        steps=steps_code or "    pass"
    )


# --- Internals ---

def _node_to_step(node: ast.stmt) -> Dict[str, Any] | None:
    if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
        return {
            "type": "call",
            "call": ast.unparse(node.value)
        }
    if isinstance(node, ast.If):
        return {
            "type": "branch",
            "condition": ast.unparse(node.test),
            "then": [_node_to_step(n) for n in node.body if _node_to_step(n) is not None],
            "else": [_node_to_step(n) for n in node.orelse if _node_to_step(n) is not None]
        }
    return None


def _steps_to_code(steps: List[Dict[str, Any]], indent: int = 4) -> str:
    lines: List[str] = []
    pad = " " * indent
    for step in steps:
        if step.get("type") == "call":
            lines.append(f"{pad}{step['call']}")
        elif step.get("type") == "branch":
            cond = step.get("condition", "True")
            lines.append(f"{pad}if {cond}:")
            lines.append(_steps_to_code(step.get("then", []), indent=indent + 4) or f"{pad}    pass")
            else_steps = _steps_to_code(step.get("else", []), indent=indent + 4)
            if else_steps:
                lines.append(f"{pad}else:")
                lines.append(else_steps)
    return "\n".join(lines)

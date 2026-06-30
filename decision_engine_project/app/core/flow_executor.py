from __future__ import annotations

import ast
from collections import defaultdict
from typing import Any, Dict, List, Optional

from app.core.function_registry import invoke
from app.models.solicitud import SolicitudMotor


def _build_outgoing_map(edges: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    outgoing: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for edge in edges:
        outgoing[edge.get("source")].append(edge)
    return outgoing


def _find_root_node(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], entry_node_id: Optional[str]) -> Optional[str]:
    if entry_node_id:
        return entry_node_id

    targets = {edge.get("target") for edge in edges}
    for node in nodes:
        if node.get("id") not in targets:
            return node.get("id")
    return nodes[0].get("id") if nodes else None


def _safe_eval(condition: str, motor: SolicitudMotor) -> bool:
    tree = ast.parse(condition, mode="eval")
    compiled = compile(tree, "<flow-condition>", "eval")
    scope = {
        "motor": motor,
        "titular": motor.titular,
        "context": motor.context,
        "applicants": motor.applicants,
        "decision": motor.decision,
    }
    return bool(eval(compiled, {"__builtins__": {}}, scope))


def execute_plan(motor: SolicitudMotor, plan: Dict[str, Any]) -> None:
    nodes = plan.get("nodes", [])
    edges = plan.get("edges", [])
    if not nodes:
        return

    nodes_by_id = {node.get("id"): node for node in nodes}
    outgoing_map = _build_outgoing_map(edges)
    current_node_id = _find_root_node(nodes, edges, plan.get("entryNodeId"))
    visited_steps = 0
    max_steps = max(len(nodes) * 2, 1)

    while current_node_id and visited_steps < max_steps:
        visited_steps += 1
        node = nodes_by_id.get(current_node_id)
        if not node:
            break

        node_type = node.get("type")
        node_data = node.get("data") or {}
        outgoing_edges = outgoing_map.get(current_node_id, [])

        if node_type == "function":
            function_name = node_data.get("functionName")
            if function_name:
                invoke(function_name, motor)

            next_edge = outgoing_edges[0] if outgoing_edges else None
            current_node_id = next_edge.get("target") if next_edge else None
            continue

        if node_type == "decision":
            condition = node_data.get("condition", "False")
            branch_result = _safe_eval(condition, motor)
            branch_key = "true" if branch_result else "false"

            next_edge = next(
                (edge for edge in outgoing_edges if (edge.get("sourceHandle") or edge.get("data", {}).get("branch")) == branch_key),
                None,
            )
            if next_edge is None and outgoing_edges:
                next_edge = outgoing_edges[0]

            current_node_id = next_edge.get("target") if next_edge else None
            continue

        current_node_id = None
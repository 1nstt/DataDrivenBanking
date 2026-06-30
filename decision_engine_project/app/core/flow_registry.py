import json
from functools import lru_cache
from pathlib import Path
from typing import Dict

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "flow_codes.json"

@lru_cache(maxsize=1)
def _load_mapping(path: Path = CONFIG_PATH) -> Dict[str, Dict[str, str]]:
    """Load flow<->code mappings from JSON."""
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "flow_to_code": data.get("flow_to_code", {}),
        "code_to_flow": data.get("code_to_flow", {})
    }

def flow_code_for(flow_name: str) -> str:
    mapping = _load_mapping()
    code = mapping["flow_to_code"].get(flow_name)
    if not code:
        raise ValueError(f"Flow code not found for flow '{flow_name}'")
    return code

def flow_name_for(flow_code: str) -> str:
    mapping = _load_mapping()
    name = mapping["code_to_flow"].get(flow_code)
    if not name:
        raise ValueError(f"Flow name not found for code '{flow_code}'")
    return name

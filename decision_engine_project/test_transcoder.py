import json
from app.flows import flow_p0
from app.core.flow_transcoder import flow_to_json

plan = flow_to_json(flow_p0.run_flow)
print(json.dumps(plan, indent=2, ensure_ascii=False))

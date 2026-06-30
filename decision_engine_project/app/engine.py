# Decision Engine
from datetime import datetime

from app.core import flow_registry
from app.core.flow_executor import execute_plan
from app.core.flow_store import get_flow
from app.models.solicitud import SolicitudMotor
from app.flows import flow_p0

class DecisionEngine:
    
    def execute(self, raw_json: dict, flow_name: str = "p0", flow_code: str = None) -> dict:
        # 1. Hidratación (JSON -> Objeto Vivo)
        # Asumimos que la data viene dentro de la llave "solicitud" o es el objeto directo
        data = raw_json.get("solicitud", raw_json)
        motor = SolicitudMotor.from_dict(data)
        
        motor.audit.evaluated_at = datetime.now().isoformat()
        
        # 2. Router de Flujos
        selected_flow = flow_name
        if flow_code:
            selected_flow = flow_registry.flow_name_for(flow_code)

        flow_plan = get_flow(selected_flow)
        if flow_plan is not None:
            execute_plan(motor, flow_plan)
        elif selected_flow == "p0":
            flow_p0.run_flow(motor)
        else:
            raise ValueError(f"Flujo desconocido: {selected_flow}")
            
        # 3. Serialización (Objeto Vivo -> JSON)
        return {"solicitud": motor.to_dict(), "flow_name": selected_flow}
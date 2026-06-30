# Solicitud
from dataclasses import dataclass, field
from typing import List, Optional, Any, Union
from datetime import datetime
from app.core.base_model import BaseModel
from app.models.domain_objects import Context, Applicant, Observation

@dataclass
class FnHistory(BaseModel):
    execution_id: str
    fn_name: str
    executed_at: str

@dataclass
class Decision(BaseModel):
    final_decision_code: str = "PENDING"
    blocking_rule_codes: List[str] = field(default_factory=list)
    required_action_codes: List[str] = field(default_factory=list)

@dataclass
class Audit(BaseModel):
    evaluated_at: str = ""

@dataclass
class SolicitudMotor(BaseModel):
    id: str
    context: Context
    applicants: List[Applicant]
    fn_history: List[Union[FnHistory, dict]] = field(default_factory=list)
    decision: Decision = field(default_factory=Decision)
    audit: Audit = field(default_factory=Audit)
    observations: List[Observation] = field(default_factory=list)

    # --- Business Helpers ---

    @property
    def titular(self) -> Optional[Applicant]:
        return next((a for a in self.applicants if a.role == 'TITULAR'), None)

    def add_observation(self, fn_name: str, message: str, value: Any = None):
        self.observations.append(Observation(fn_name=fn_name, message=message, value=value))

    def reject_request(self, rule_code: str, reason: str):
        """Marca la solicitud como rechazada."""
        self.decision.final_decision_code = "REJECTED"
        self.decision.blocking_rule_codes.append(rule_code)
        self.add_observation("SYSTEM", f"Rechazo Automático: {rule_code}", reason)

    def log_execution(self, fn_name: str):
        """Registra que una función (cálculo o regla) se ejecutó."""
        self.fn_history.append(FnHistory(
            execution_id=f"exec-{len(self.fn_history)+1}",
            fn_name=fn_name,
            executed_at=datetime.now().isoformat()
        ))

    def finalize_decision(self):
        """Establece la decisión final basada en blocking_rule_codes y required_action_codes."""
        has_blocking = len(self.decision.blocking_rule_codes) > 0
        has_required_actions = len(self.decision.required_action_codes) > 0
        
        if has_blocking:
            self.decision.final_decision_code = "REJECTED"
        elif has_required_actions:
            self.decision.final_decision_code = "REQUIRE_ACTION"
        else:
            self.decision.final_decision_code = "APPROVED"
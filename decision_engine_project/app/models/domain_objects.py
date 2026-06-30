from dataclasses import dataclass, field
from typing import List, Optional, Any
from app.core.base_model import BaseModel

# --- Componentes Base ---
@dataclass
class Observation(BaseModel):
    fn_name: str
    message: str
    value: Any = None

@dataclass
class Context(BaseModel):
    property_id: str
    monthly_rent: float
    currency: str

# --- Estructuras de Ingresos ---
@dataclass
class Payslip(BaseModel):
    month_index: int
    net_income: float
    period: str = ""
    gross_income: float = 0.0

@dataclass
class DependentData(BaseModel):
    payslips: List[Payslip] = field(default_factory=list)

@dataclass
class IncomeSource(BaseModel):
    type: str  # 'DEPENDENT', 'INDEPENDENT', etc.
    dependent: Optional[DependentData] = None

# --- Datos Comerciales ---
@dataclass
class DicomData(BaseModel):
    is_hard_debt: bool = False
    score: int = 999

@dataclass
class CommercialData(BaseModel):
    dicom: Optional[DicomData] = None
    estimated_monthly_debt_payment: float = 0.0

# --- Métricas y Resultados (Donde escriben las funciones) ---
@dataclass
class IncomeMetrics(BaseModel):
    avg_6m: float = 0.0

@dataclass
class FinancialMetrics(BaseModel):
    debt_to_income_ratio: float = 0.0

@dataclass
class CalculatedMetrics(BaseModel):
    income: IncomeMetrics = field(default_factory=IncomeMetrics)
    financial_load: FinancialMetrics = field(default_factory=FinancialMetrics)

@dataclass
class RuleResult(BaseModel):
    evaluation_code: str = "PENDING"
    triggered_rule_codes: List[str] = field(default_factory=list)

@dataclass
class EvaluationResults(BaseModel):
    income: RuleResult = field(default_factory=RuleResult)

# --- Datos Cualitativos ---
@dataclass
class QualitativeData(BaseModel):
    presentation: str = ""
    previous_landlord_comments: str = ""
    family_size: int = 0
    has_pets: int = 0
    references_count: int = 0

# --- Applicant (Entidad Principal) ---
@dataclass
class Identity(BaseModel):
    full_name: str = ""
    document_type: str = ""

@dataclass
class Applicant(BaseModel):
    id: str
    role: str # 'TITULAR', 'AVAL'
    income_source: IncomeSource
    identity: Identity = field(default_factory=Identity)
    commercial_data: CommercialData = field(default_factory=CommercialData)
    qualitative_data: QualitativeData = field(default_factory=QualitativeData)
    calculated_metrics: CalculatedMetrics = field(default_factory=CalculatedMetrics)
    evaluation_results: EvaluationResults = field(default_factory=EvaluationResults)

    @property
    def is_dependent(self) -> bool:
        return self.income_source.type == "DEPENDENT" and self.income_source.dependent is not None
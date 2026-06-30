Motor de Decisión de Arriendos (Architecture Definition)
1. Visión General del Sistema
Este proyecto implementa un Motor de Decisión para Evaluación de Riesgo Inmobiliario. Su objetivo es procesar solicitudes de arriendo complejas (múltiples aplicantes, ingresos mixtos, avales) y emitir una decisión automática (Aprobado, Rechazado, Requiere Revisión) basada en reglas configurables.

Filosofía de Diseño
Patrón "Objeto Vivo" (Live Object): El JSON de entrada se hidrata en un grafo de objetos Python (SolicitudMotor). Este objeto es mutable y viaja a través de una tubería de funciones que lo modifican in-place.

Cero Dependencias Pesadas: Se utilizan dataclasses nativas de Python. No se usa Pydantic ni ORMs pesados para el núcleo de decisión.

Separación Estricta: Cálculo (fn_) separado de Decisión (rl_) separado de Orquestación (flow).

2. Estructura del Proyecto
Plaintext

decision_engine_project/
│
├── app/
│   ├── core/                   # Framework Base
│   │   ├── base_model.py       # Hidratación recursiva (Dict <-> Dataclass)
│   │   └── decorators.py       # @track_execution (Logging automático)
│   │
│   ├── models/                 # Definición de Datos
│   │   ├── domain_objects.py   # Applicant, Context, IncomeSource, Metrics
│   │   └── solicitud.py        # SolicitudMotor (Objeto Raíz + Helpers)
│   │
│   ├── library/                # Bloques de Lógica Atómica
│   │   ├── calculations/       # fn_ (Matemáticas, Transformaciones)
│   │   └── rulesets/           # rl_ (Validaciones, Bloqueos)
│   │
│   ├── flows/                  # Guiones de Ejecución (Scripts Python)
│   │   ├── flow_p0.py          # Flujo de evaluación rápida
│   │   └── flow_standard.py    # Flujo completo
│   │
│   └── engine.py               # Orquestador (Entrypoint)
│
├── data/
│   ├── input/                  # JSONs de entrada
│   └── output/                 # Resultados procesados
│
└── main.py                     # Script de ejecución Batch
3. Modelo de Datos (SolicitudMotor)
El objeto SolicitudMotor es la única fuente de verdad durante la ejecución.

Componentes Clave
context: Datos del arriendo (precio, moneda, propiedad).

applicants: Lista de postulantes. Cada uno contiene:

identity: Datos personales.

income_source: Estructura polimórfica (Dependiente, Independiente, Empresa).

calculated_metrics: Destino de las funciones fn_ (ej. avg_6m).

evaluation_results: Destino de las funciones rl_ (ej. APPROVED/REJECTED).

decision: Estado global de la solicitud.

fn_history: Log inmutable de qué funciones se ejecutaron y cuándo.

Helpers de Negocio
La clase SolicitudMotor expone métodos para simplificar la lectura de las reglas:

motor.titular -> Retorna el objeto Applicant con rol TITULAR.

motor.reject_request(code, reason) -> Marca la solicitud como rechazada y agrega la razón.

motor.finalize_decision() -> Calcula el estado final basado en si existen reglas bloqueantes activas.

4. Tipos de Funciones (Library)
A. Funciones de Cálculo (fn_*)
Responsabilidad: Transformar datos crudos en métricas utilizables.

Prohibido: Tomar decisiones o rechazar solicitudes.

Output: Escriben en applicant.calculated_metrics.

Ejemplo: fn_calcular_promedio_renta(motor)

B. Rulesets (rl_*)
Responsabilidad: Aplicar políticas de riesgo sobre métricas ya calculadas.

Prohibido: Realizar cálculos complejos (matemáticas pesadas).

Output: Escriben en evaluation_results y llaman a motor.reject_request().

Ejemplo: rl_check_dicom(motor), rl_renta_minima(motor)

5. Arquitectura de Flujos Visuales (Hybrid Low-Code)
El sistema permite definir flujos mediante una interfaz visual (Frontend) que se compila a código Python seguro (Backend).

El Flujo de Trabajo
Frontend (UI): El usuario conecta nodos (Inicio, Función, Condición, Regla).

JSON IR: Se genera una Representación Intermedia en JSON.

Transpilador: El backend convierte el JSON a un archivo .py válido en app/flows/.

Estructura del JSON IR
JSON

{
  "flow_name": "flow_p0",
  "nodes": [
    { "type": "start", "next": "step_1" },
    { "type": "function", "library": "income", "name": "fn_calc_renta", "next": "cond_1" },
    { 
      "type": "condition", 
      "expression": "motor.titular.calculated_metrics.income.avg_6m > 0",
      "on_true": "step_dicom", 
      "on_false": "step_reject" 
    }
  ]
}
Código Generado (Resultado Final)
El transpilador genera código Python limpio, legible y nativo. No incluye lógica de logging explícita (se asume manejada por decoradores internos).

Python

from app.models.solicitud import SolicitudMotor
from app.library.calculations import income
from app.library.rulesets import hard_rules

def run_flow(motor: SolicitudMotor):
    """
    Flujo Generado Automáticamente: Evaluación P0
    """
    
    # 1. Fase de Cálculos
    income.fn_calcular_promedio_renta(motor)

    # 2. Lógica de Negocio
    if motor.titular and motor.titular.calculated_metrics.income.avg_6m > 0:
        hard_rules.rl_check_dicom(motor)
        hard_rules.rl_renta_minima(motor)
    else:
        hard_rules.rl_sin_ingresos(motor)

    # 3. Cierre de Estado
    motor.finalize_decision()
6. Seguridad y Despliegue
Validación de Código (AST)
Si se permite código custom ("Scripting") dentro de los flujos, el backend valida el código antes de guardarlo usando ast.parse() para asegurar:

Sintaxis Python válida.

Ausencia de imports peligrosos (os, sys, subprocess).

Hot-Reloading
El DecisionEngine utiliza importlib.reload() para detectar cambios en los archivos de flujo sin necesidad de reiniciar el servidor de aplicaciones, permitiendo ajustes de reglas en tiempo real.

7. Ejecución (Ejemplo de Uso)
Python

from app.engine import DecisionEngine

# 1. Cargar JSON
raw_json = { ... } 

# 2. Instanciar Motor
engine = DecisionEngine()

# 3. Ejecutar Flujo Específico
# El motor hidrata el JSON, busca 'app/flows/flow_p0.py' y lo ejecuta.
resultado = engine.execute(raw_json, flow_name="p0")

print(resultado["solicitud"]["decision"]["final_decision_code"])
# Output: "APPROVED" o "REJECTED"
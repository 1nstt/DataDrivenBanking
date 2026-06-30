# Proyecto: Motor de Decisión para Evaluación de Arriendos

## Qué es
Motor Python basado en dataclasses que hidrata una solicitud de arriendo desde JSON a un grafo de objetos, ejecuta cálculos y reglas en flujos orquestados, y serializa el resultado a JSON. Sin dependencias pesadas.

## Componentes clave
- decision_engine_project/app/engine.py: Router principal. Toma JSON (clave "solicitud"), hidrata a SolicitudMotor, ejecuta el flujo (p0 por defecto), y devuelve dict serializable.
- decision_engine_project/app/models/solicitud.py: Raíz SolicitudMotor (contexto, applicants, fn_history, decision, audit, observations) y helpers (titular, reject_request, add_observation, log_execution, finalize_decision). finalize_decision setea final_decision_code: REJECTED si hay blocking_rule_codes; REQUIRE_ACTION si solo hay required_action_codes; APPROVED si ninguno.
- decision_engine_project/app/models/domain_objects.py: Dataclasses de dominio (Applicant, IncomeSource, CommercialData, QualitativeData, CalculatedMetrics, EvaluationResults, etc.).
- decision_engine_project/app/core/base_model.py: Conversión recursiva dict <-> dataclass.
- decision_engine_project/app/core/decorators.py: Decorador track_execution captura inputs/outputs y registra en fn_history (execution_id, fn_name, executed_at, inputs, outputs) tomando snapshots antes/después.

## Flujos
- decision_engine_project/app/flows/flow_p0.py: Flujo rápido P0. Calcula promedio de renta, ejecuta reglas de DICOM y renta mínima si hay ingresos; si no, regla sin_ingresos. Siempre llama motor.finalize_decision al cierre.

## Cálculos (fn_*)
- decision_engine_project/app/library/calculations/income.py: fn_calcular_promedio_renta calcula promedio de liquidaciones para dependientes, escribe en calculated_metrics.income.avg_6m, agrega observation informativa.

## Reglas (rl_*)
- decision_engine_project/app/library/rulesets/hard_rules.py: rl_check_dicom rechaza si hay deuda dura; rl_renta_minima exige renta >= 3x arriendo; rl_sin_ingresos rechaza si no hay ingresos válidos. Todas usan track_execution.

## Datos de entrada/salida
- decision_engine_project/data/input/*.json: Casos de prueba. Resultados se guardan en decision_engine_project/data/output/ via main.py.

## Ejecución
- Ejecutar desde decision_engine_project: `python main.py` (procesa batch en data/input con flujo p0). Para uso programático: DecisionEngine().execute(raw_json, flow_name="p0").

## Modelo de datos
- datamodel/ModeloDatos.json: Esquema de la solicitud y sus componentes, incluyendo historial de funciones con inputs/outputs, datos cualitativos (family_size, has_pets numérico, references_count), métricas calculadas y resultados de evaluación.

## Notas de arquitectura
- Patrón Objeto Vivo + Flujos de Orquestación. Las funciones mutan el objeto en sitio. Flujos solo coordinan; el cierre de decisión es centralizado en finalize_decision. Logging y fn_history se manejan vía decorador en cada fn_/rl_.

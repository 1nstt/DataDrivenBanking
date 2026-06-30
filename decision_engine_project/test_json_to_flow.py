import json
from app.core.flow_transcoder import json_to_flow

plan = {
  "flow_name": "run_flow",
  "steps": [
    {
      "type": "call",
      "call": "income.fn_calcular_promedio_renta(motor)"
    },
    {
      "type": "branch",
      "condition": "titular and titular.calculated_metrics.income.avg_6m > 0",
      "then": [
        {
          "type": "call",
          "call": "hard_rules.rl_check_dicom(motor)"
        },
        {
          "type": "call",
          "call": "hard_rules.rl_renta_minima(motor)"
        }
      ],
      "else": [
        {
          "type": "call",
          "call": "hard_rules.rl_sin_ingresos(motor)"
        }
      ]
    },
    {
      "type": "call",
      "call": "motor.finalize_decision()"
    }
  ]
}

code = json_to_flow(plan)
print(code)

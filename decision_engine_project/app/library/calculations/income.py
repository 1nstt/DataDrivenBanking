# Income calculations
from app.models.solicitud import SolicitudMotor
from app.core.decorators import track_execution

@track_execution
def fn_calcular_promedio_renta(motor: SolicitudMotor):
    """Calcula el promedio de las liquidaciones para dependientes."""
    
    
    
    for app in motor.applicants:
        if app.is_dependent:
            payslips = app.income_source.dependent.payslips
            if payslips:
                total = sum(p.net_income for p in payslips)
                avg = total / len(payslips)
                
                # Mutación del objeto
                app.calculated_metrics.income.avg_6m = avg
                
                # Log opcional
                motor.add_observation("fn_calc_renta", f"Promedio calculado App {app.id}", avg)
            else:
                app.calculated_metrics.income.avg_6m = 0.0
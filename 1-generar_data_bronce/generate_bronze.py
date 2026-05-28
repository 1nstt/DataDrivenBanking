import pandas as pd
import numpy as np

print("Generando base de datos histórica de 1.000.000 de clientes para capa Bronce...")
np.random.seed(42)

n_clientes = 1000000
n_fraudes = 1000

ingreso = np.random.normal(1500, 500, n_clientes)
score_crediticio = np.random.normal(650, 100, n_clientes)
monto_solicitado = np.random.normal(3000, 1500, n_clientes)
antiguedad_laboral = np.random.poisson(36, n_clientes)
deuda_actual = np.random.normal(1000, 800, n_clientes)
es_fraude = np.zeros(n_clientes)

idx_fraude = np.random.choice(n_clientes, n_fraudes, replace=False)
ingreso[idx_fraude] = np.random.normal(800, 50, n_fraudes)
score_crediticio[idx_fraude] = np.random.normal(400, 20, n_fraudes)
monto_solicitado[idx_fraude] = np.random.normal(15000, 500, n_fraudes)
antiguedad_laboral[idx_fraude] = 0
deuda_actual[idx_fraude] = np.random.normal(5000, 200, n_fraudes)
es_fraude[idx_fraude] = 1

df = pd.DataFrame({
    'ingreso_mensual': ingreso,
    'score_crediticio': score_crediticio,
    'monto_solicitado': monto_solicitado,
    'antiguedad_laboral_meses': antiguedad_laboral,
    'deuda_actual': deuda_actual,
    'es_fraude': es_fraude.astype(int)
})

print("Guardando a clientes_bronce.csv ...")
df.to_csv("1-generar_data_bronce/clientes_bronce.csv", index=False)
print("¡Archivo Creado!")

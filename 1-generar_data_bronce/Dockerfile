FROM python:3.11-slim

# Establecer la zona de trabajo dentro del contenedor
WORKDIR /app

RUN pip install --no-cache-dir pandas numpy

# El docker-compose monta la carpeta raíz del proyecto en /app,
# por lo que accederemos con la ruta relativa de la carpeta
CMD ["python", "1-generar_data_bronce/generate_bronze.py"]
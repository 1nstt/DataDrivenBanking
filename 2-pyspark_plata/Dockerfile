FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
RUN apt-get update && apt-get install -y default-jre && \
    pip install --no-cache-dir pandas numpy scikit-learn pymongo pyspark

# Ejecutar como el usuario del host para evitar artefactos root en el volumen montado
USER 1000:1000

# Copiar archivos necesarios
COPY lsh2.py .

# Ejecutar el script
CMD ["python3", "lsh2.py"]

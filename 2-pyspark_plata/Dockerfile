FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
RUN apt-get update && apt-get install -y default-jre && \
    pip install --no-cache-dir pandas numpy scikit-learn pymongo pyspark

# Copiar archivos necesarios
COPY lsh2.py .

# Ejecutar el script
CMD ["python3", "lsh2.py"]

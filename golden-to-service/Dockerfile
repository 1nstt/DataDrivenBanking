FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
RUN pip install --no-cache-dir pandas numpy scikit-learn pymongo

# Copiar archivos necesarios
COPY lsh2.py .

# Ejecutar el script
CMD ["python3", "lsh2.py"]

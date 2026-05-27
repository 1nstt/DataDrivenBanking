FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
RUN pip install --no-cache-dir pymongo

# Copiar archivos necesarios
COPY Variant* .
COPY load_to_mongodb.py .

# Ejecutar el script
CMD ["python3", "load_to_mongodb.py"]

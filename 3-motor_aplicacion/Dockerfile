FROM python:3.11-slim

# Establecer la zona de trabajo dentro del contenedor
WORKDIR /app

# Instalar dependencias necesarias para el motor
# (Se hace antes de copiar el código para aprovechar el caché de Docker)
RUN pip install --no-cache-dir pandas numpy pymongo

# Como el motor necesita leer el JSON, 
# el docker-compose monta el directorio principal en /app.
# El punto de entrada será el main.py dentro de su nueva carpeta
WORKDIR /app
CMD ["python", "3-motor_aplicacion/main.py"]
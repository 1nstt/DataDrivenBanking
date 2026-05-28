FROM python:3.11-slim

# Establecer la zona de trabajo dentro del contenedor
WORKDIR /app

# Instalar dependencias necesarias para el motor
# (Se hace antes de copiar el código para aprovechar el caché de Docker)
RUN pip install --no-cache-dir pandas numpy pymongo

# Como el motor necesita leer el JSON de 'golden-to-service', 
# lo ideal es que en tu docker-compose montes el directorio principal en /app,
# pero si quieres empaquetarlo suelto, su punto de entrada será el main.py
WORKDIR /app/Motor
CMD ["python", "main.py"]
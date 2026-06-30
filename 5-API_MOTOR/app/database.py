import os
from motor.motor_asyncio import AsyncIOMotorClient

# Captura las credenciales que le pasaremos por el docker-compose
MONGO_HOST = os.getenv("MONGO_HOST", "mongodb")
MONGO_PORT = os.getenv("MONGO_PORT", "27017")
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "password")
MONGO_DB = os.getenv("MONGO_DB", "bank_db")

# Estructurar URI de conexión estándar de Mongo
MONGO_DETAILS = f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/"

client = AsyncIOMotorClient(MONGO_DETAILS)
database = client[MONGO_DB]

def get_collection(collection_name: str):
    return database[collection_name]
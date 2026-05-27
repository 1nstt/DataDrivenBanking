#!/usr/bin/env python3
"""Carga los datos de Variant III.csv a MongoDB."""

import csv
import os
from pymongo import MongoClient, errors

# Configuración
CSV_FILE = "Variant III.csv"
MONGO_HOST = os.getenv("MONGO_HOST", "mongodb")
MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "password")
MONGO_DB = os.getenv("MONGO_DB", "bank_db")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "transactions")


def connect_mongodb():
    """Conecta a MongoDB."""
    connection_string = (
        f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/"
    )
    print(f"Conectando a {MONGO_HOST}:{MONGO_PORT}...")
    client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        print("✓ Conexión exitosa a MongoDB")
        return client
    except errors.ServerSelectionTimeoutError:
        print("✗ Error: No se puede conectar a MongoDB")
        raise


def load_csv_to_mongodb(client):
    """Carga los datos del CSV a MongoDB."""
    db = client[MONGO_DB]
    collection = db[MONGO_COLLECTION]

    try:
        print(f"Buscando archivo: {CSV_FILE}")
        with open(CSV_FILE, "r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            documents = []

            for i, row in enumerate(reader, 1):
                # Convertir valores numéricos donde sea posible
                processed_row = {}
                for key, value in row.items():
                    try:
                        # Intentar conversión a float
                        if "." in str(value):
                            processed_row[key] = float(value)
                        else:
                            processed_row[key] = int(value)
                    except (ValueError, TypeError):
                        # Mantener como string si no es numérico
                        processed_row[key] = value
                documents.append(processed_row)

                if i % 10000 == 0:
                    print(f"Procesados {i} registros...")

            if documents:
                result = collection.insert_many(documents)
                print(f"✓ {len(result.inserted_ids)} documentos insertados en {MONGO_DB}.{MONGO_COLLECTION}")
                return True
            else:
                print("✗ No se encontraron datos en el CSV")
                return False

    except FileNotFoundError:
        print(f"✗ Archivo no encontrado: {CSV_FILE}")
        return False
    except Exception as e:
        print(f"✗ Error al cargar datos: {e}")
        return False


def main():
    """Función principal."""
    try:
        client = connect_mongodb()
        success = load_csv_to_mongodb(client)
        client.close()

        if success:
            print("\n✓ Proceso completado exitosamente")
            return 0
        else:
            print("\n✗ Proceso completado con errores")
            return 1

    except Exception as e:
        print(f"\n✗ Error fatal: {e}")
        return 1


if __name__ == "__main__":
    exit(main())

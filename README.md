# Data Driven Banking

Repositorio proyecto Data Driven Banking.

## Integrantes

- Renato Yañez
- Maximiliano Juarez
- Rafael Encina
- Benjamin Polanco
- Camilo Rios.
- Dante Hortuvia

## Instalación y Uso

### Iniciar el proyecto

```bash
docker-compose up
```

Esto levantará:

- **MongoDB** en puerto `27017`
- **MongoExpress** en puerto `8081` (interfaz visual para MongoDB)
- **Golden-to-service** (carga automática de datos)

### Extracción del 1% de datos a carpeta clientes

1. **Coloca el archivo `Variant III.csv` en la carpeta `golden-to-service`**

2. **Ejecuta el script de extracción** (solo una vez):

```bash
cd golden-to-service
python3 move_20pct_to_clientes.py --percentage 0.01 --seed 42
```

Esto:

- Extrae el 1% del dataset de `Variant III.csv`
- Guarda esos registros en `../clientes/clientes.csv`
- Elimina esos registros del archivo original

## ⚠️ Advertencias

**Importante**: Cada vez que se inicia `docker-compose up` con el servicio `golden-to-service` activo, los datos se cargarán nuevamente en MongoDB. Esto puede resultar en duplicados. Si quieres evitar esto, comenta o deshabilita el servicio en el `docker-compose.yml`.

:3

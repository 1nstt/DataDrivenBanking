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

Para hacer la prueba de replicacion, se debe levantar el docker compose con el flag docker-compose --scale datanode=6 -d para que hayan 6 nodos arriba, luego con docker ps se puede ver el id de los contenedores de los datanode y hacerles stop, finalmente en el namenode se va a demorar 630 segundos end etectar los nodos como caidos para realizar la replicacion a los otros nodos (esta configurado con factor de replicacion 3 por lo que se tienen que caer 3 nodos para que haya recien la probabilidad de haber perdido informacion, si se caen 2 va a haber si o si un tercer nodo que tenga cada uno de los bloques de los 2 nodos que se cayeron)

:3

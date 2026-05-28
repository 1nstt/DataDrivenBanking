# Script para subir la data de Bronce local a Hadoop HDFS

echo "Creando directorio /capa-bronce en HDFS..."
docker exec -it namenode hdfs dfs -mkdir -p /capa-bronce

echo "Copiando archivo local al contenedor NameNode..."
docker cp 1-generar_data_bronce/clientes_bronce.csv namenode:/tmp/clientes_bronce.csv

echo "Moviendo archivo desde el NameNode hacia el FileSystem HDFS..."
docker exec -it namenode hdfs dfs -put -f /tmp/clientes_bronce.csv /capa-bronce/

echo "Listando archivos listos en HDFS:"
docker exec -it namenode hdfs dfs -ls /capa-bronce/

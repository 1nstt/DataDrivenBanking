#!/usr/bin/env bash

set -euo pipefail

HDFS_BIN=/opt/hadoop-3.2.1/bin/hdfs
SOURCE_CSV=/app/1-generar_data_bronce/clientes_bronce.csv

echo 'Esperando a que HDFS inicie...'
until "$HDFS_BIN" dfs -ls hdfs://namenode:9000/ >/dev/null 2>&1; do
  sleep 3
done

echo 'HDFS listo! Subiendo csv de capa bronce...'
"$HDFS_BIN" dfs -mkdir -p /capa-bronce
"$HDFS_BIN" dfs -put -f "$SOURCE_CSV" /capa-bronce/
"$HDFS_BIN" dfs -ls /capa-bronce
echo 'Archivo subido a HDFS exitosamente.'
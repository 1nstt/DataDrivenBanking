#!/usr/bin/env python3
"""Mueve un porcentaje de filas desde un CSV a la carpeta clientes.

Por defecto toma el 1% de las filas de `Variant III.csv`, las escribe en
`clientes/Variant III_clientes.csv` y elimina esas mismas filas del archivo
original. NO DOCKERIZADO Y SOLO EJECUTAR CUANDO SE QUIERA SEPARAR VARIANT DE CLIENTES
"""

from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path
from tempfile import NamedTemporaryFile


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Mueve un porcentaje de filas de un CSV a la carpeta clientes."
    )
    parser.add_argument(
        "--input",
        default="Variant III.csv",
        help="CSV de origen. Por defecto: Variant III.csv",
    )
    parser.add_argument(
        "--output-dir",
        default="../clientes",
        help="Directorio destino para las filas movidas. Por defecto: ../clientes",
    )
    parser.add_argument(
        "--output-file",
        default=None,
        help="Archivo CSV destino. Si no se indica, se usa <nombre>_clientes.csv.",
    )
    parser.add_argument(
        "--percentage",
        type=float,
        default=1.0,
        help="Porcentaje a mover. Puede expresarse como 1 o 0.01. Por defecto: 1",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Semilla opcional para obtener una selección reproducible.",
    )
    return parser.parse_args()


def normalize_percentage(value: float) -> float:
    if value <= 0:
        raise ValueError("El porcentaje debe ser mayor que 0.")
    if value <= 1:
        return value
    if value > 100:
        raise ValueError("El porcentaje no puede ser mayor que 100.")
    return value / 100.0


def main() -> None:
    args = parse_args()
    percentage = normalize_percentage(args.percentage)

    input_path = Path(args.input).resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"No existe el archivo de entrada: {input_path}")

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = (
        Path(args.output_file).resolve()
        if args.output_file
        else output_dir / f"{input_path.stem}_clientes{input_path.suffix}"
    )
    if not args.output_file:
        output_path = output_dir / "clientes.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rng = random.Random(args.seed)

    with input_path.open("r", newline="", encoding="utf-8") as source:
        reader = csv.reader(source)
        header = next(reader, None)
        if header is None:
            raise ValueError("El archivo CSV está vacío.")

        total_rows = sum(1 for _ in reader)

    if total_rows == 0:
        raise ValueError("El CSV no contiene filas de datos.")

    rows_to_move = max(1, round(total_rows * percentage))
    rows_to_move = min(rows_to_move, total_rows)

    selected_indexes = set(rng.sample(range(total_rows), rows_to_move))

    with (
        input_path.open("r", newline="", encoding="utf-8") as source,
        NamedTemporaryFile(
            "w", newline="", encoding="utf-8", delete=False, dir=str(input_path.parent)
        ) as temp_source,
        output_path.open("w", newline="", encoding="utf-8") as moved_file,
    ):
        reader = csv.reader(source)
        source_header = next(reader, None)
        if source_header != header:
            raise ValueError("El encabezado del CSV cambió entre lecturas.")

        source_writer = csv.writer(temp_source)
        moved_writer = csv.writer(moved_file)

        source_writer.writerow(header)
        moved_writer.writerow(header)

        for index, row in enumerate(reader):
            if index in selected_indexes:
                moved_writer.writerow(row)
            else:
                source_writer.writerow(row)

        temp_source_path = Path(temp_source.name)

    temp_source_path.replace(input_path)

    print(
        f"Movidas {rows_to_move} de {total_rows} filas "
        f"({rows_to_move / total_rows:.2%}) a {output_path}"
    )
    print(f"Archivo original actualizado: {input_path}")


if __name__ == "__main__":
    main()
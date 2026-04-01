from __future__ import annotations

from typing import Iterable

import pandas as pd

from src.transform import SeriesResult, info, summarize_series


FINAL_COLUMNS = [
    "fecha",
    "uf",
    "ipc_general",
    "ipc_alimentos",
    "ipc_vivienda_servicios_basicos",
    "inflacion_esperada_12m",
    "usdclp",
    "brent",
    "indice_remuneraciones",
    "indice_costos_laborales",
    "imacec",
]


def merge_series(results: Iterable[SeriesResult]) -> pd.DataFrame:
    frames = [result.data for result in results if not result.data.empty]

    if not frames:
        return pd.DataFrame(columns=FINAL_COLUMNS)

    long_df = pd.concat(frames, ignore_index=True)
    long_df["fecha"] = long_df["fecha"].astype(str)
    long_df = long_df.drop_duplicates(subset=["fecha", "nombre_variable"], keep="last")

    wide = (
        long_df.pivot(index="fecha", columns="nombre_variable", values="valor")
        .reset_index()
        .sort_values("fecha")
        .reset_index(drop=True)
    )

    for column in FINAL_COLUMNS:
        if column not in wide.columns:
            wide[column] = pd.NA

    return wide[FINAL_COLUMNS]


def print_series_summary(results: Iterable[SeriesResult]) -> None:
    info("Resumen por serie")
    for result in results:
        print(f"  - {summarize_series(result)}")


def build_validation_report(dataset: pd.DataFrame) -> dict[str, object]:
    nulls = dataset.isna().sum().to_dict()
    return {
        "rows": int(len(dataset)),
        "date_start": None if dataset.empty else dataset["fecha"].min(),
        "date_end": None if dataset.empty else dataset["fecha"].max(),
        "nulls_by_column": {key: int(value) for key, value in nulls.items()},
    }


def print_dataset_summary(dataset: pd.DataFrame) -> None:
    report = build_validation_report(dataset)
    info("Resumen dataset final")
    print(f"  - filas totales: {report['rows']}")
    print(f"  - rango: {report['date_start']} -> {report['date_end']}")
    print("  - nulos por columna:")
    for column, value in report["nulls_by_column"].items():
        print(f"    * {column}: {value}")

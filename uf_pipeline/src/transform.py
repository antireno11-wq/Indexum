from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import pandas as pd


SPANISH_MONTH_MAP = {
    "ene": 1,
    "feb": 2,
    "mar": 3,
    "abr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "ago": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dic": 12,
}

ENGLISH_MONTH_MAP = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


@dataclass
class SeriesResult:
    variable: str
    data: pd.DataFrame
    source_name: str
    source_url: str
    is_real: bool
    notes: str
    raw_frequency: str
    monthly_method: str


def info(message: str) -> None:
    print(f"[INFO] {message}")


def warn(message: str) -> None:
    print(f"[WARN] {message}")


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_text(path: Path, content: str) -> None:
    ensure_directory(path.parent)
    path.write_text(content, encoding="utf-8")


def save_bytes(path: Path, content: bytes) -> None:
    ensure_directory(path.parent)
    path.write_bytes(content)


def save_json(path: Path, payload: object) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_number(value: object) -> Optional[float]:
    if value is None:
        return None

    text = str(value).strip()
    if not text or text in {"NA", "N/A", ".", "..", "nan", "None"}:
        return None

    text = text.replace("\xa0", "").replace(" ", "")
    text = re.sub(r"[^0-9,.\-]", "", text)

    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        text = text.replace(".", "").replace(",", ".")

    try:
        return float(text)
    except ValueError:
        return None


def detect_frequency(dates: Iterable[pd.Timestamp]) -> str:
    series = pd.Series(pd.to_datetime(list(dates), errors="coerce")).dropna().sort_values()
    if len(series) < 3:
        return "insuficiente"

    deltas = series.diff().dropna().dt.days
    if deltas.empty:
        return "insuficiente"

    median_delta = float(deltas.median())
    if median_delta <= 2:
        return "diaria"
    if median_delta <= 10:
        return "semanal"
    if median_delta <= 40:
        return "mensual"
    if median_delta <= 100:
        return "trimestral"
    return "irregular"


def to_month_string(date_value: object) -> str:
    return pd.to_datetime(date_value).strftime("%Y-%m")


def build_long_frame(
    dates: Iterable[object],
    values: Iterable[object],
    variable: str,
) -> pd.DataFrame:
    frame = pd.DataFrame({"fecha": list(dates), "valor": list(values)})
    frame["fecha"] = pd.to_datetime(frame["fecha"], errors="coerce")
    frame["valor"] = frame["valor"].apply(parse_number)
    frame = frame.dropna(subset=["fecha"]).sort_values("fecha")
    frame["nombre_variable"] = variable
    return frame[["fecha", "nombre_variable", "valor"]]


def monthly_aggregate(frame: pd.DataFrame, variable: str, method: str) -> pd.DataFrame:
    if frame.empty:
        return pd.DataFrame(columns=["fecha", "nombre_variable", "valor"])

    working = frame.copy()
    working["fecha"] = pd.to_datetime(working["fecha"], errors="coerce")
    if hasattr(working["fecha"].dt, "tz_localize"):
        try:
            working["fecha"] = working["fecha"].dt.tz_localize(None)
        except TypeError:
            pass
    working["valor"] = working["valor"].apply(parse_number)
    working = working.dropna(subset=["fecha"]).sort_values("fecha")
    working["year_month"] = working["fecha"].dt.to_period("M")

    if method == "last":
        aggregated = working.groupby("year_month", as_index=False).last()
    elif method == "mean":
        aggregated = working.groupby("year_month", as_index=False)["valor"].mean()
    else:
        raise ValueError(f"Unsupported monthly aggregation method: {method}")

    aggregated["fecha"] = aggregated["year_month"].astype(str)
    aggregated["nombre_variable"] = variable
    aggregated = aggregated[["fecha", "nombre_variable", "valor"]].drop_duplicates(subset=["fecha", "nombre_variable"])
    aggregated = aggregated.sort_values("fecha").reset_index(drop=True)
    return aggregated


def parse_spanish_month_token(token: str) -> str:
    cleaned = token.strip()
    match = re.match(r"([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\.?(\d{4})", cleaned)
    if not match:
        raise ValueError(f"Unsupported Spanish month token: {token}")

    month_key = match.group(1).lower()[:3]
    month = SPANISH_MONTH_MAP[month_key]
    year = int(match.group(2))
    return f"{year:04d}-{month:02d}"


def parse_english_month_label(label: str) -> str:
    match = re.match(r"(\d{4})\s+([A-Za-z]+)", label.strip())
    if not match:
        raise ValueError(f"Unsupported English month label: {label}")

    year = int(match.group(1))
    month_name = match.group(2).lower()
    month = ENGLISH_MONTH_MAP[month_name]
    return f"{year:04d}-{month:02d}"


def summarize_series(result: SeriesResult) -> str:
    frame = result.data
    if frame.empty:
        return f"{result.variable}: sin filas"

    return (
        f"{result.variable}: {len(frame)} filas | "
        f"rango {frame['fecha'].min()} -> {frame['fecha'].max()} | "
        f"nulos {int(frame['valor'].isna().sum())} | "
        f"frecuencia original {result.raw_frequency} | mensualizacion {result.monthly_method}"
    )

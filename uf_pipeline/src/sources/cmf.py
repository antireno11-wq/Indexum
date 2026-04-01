from __future__ import annotations

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.transform import (
    SeriesResult,
    detect_frequency,
    info,
    monthly_aggregate,
    save_json,
    warn,
)


MINDICADOR_BASE_URL = "https://mindicador.cl/api"
CMF_BASE_URL = "https://api.cmfchile.cl/api-sbifv3/recursos_api"


def _build_session() -> requests.Session:
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _extract_cmf_points(payload: dict[str, Any]) -> list[dict[str, Any]]:
    for value in payload.values():
        if isinstance(value, list) and value and isinstance(value[0], dict):
            return value
    return []


def _fetch_mindicador_history(series_code: str, start_year: int, raw_path: Path) -> pd.DataFrame:
    current_year = datetime.utcnow().year
    all_points: list[dict[str, Any]] = []
    session = _build_session()
    raw_years_dir = raw_path.parent / f"{series_code}_years"
    raw_years_dir.mkdir(parents=True, exist_ok=True)

    for year in range(start_year, current_year + 1):
        year_path = raw_years_dir / f"{year}.json"
        if year_path.exists():
            payload = json.loads(year_path.read_text(encoding="utf-8"))
        else:
            info(f"Descargando {series_code} desde mindicador.cl para {year}")
            try:
                response = session.get(f"{MINDICADOR_BASE_URL}/{series_code}/{year}", timeout=(15, 60))
                response.raise_for_status()
                payload = response.json()
                save_json(year_path, payload)
            except Exception as error:
                warn(f"No fue posible descargar {series_code} {year} desde mindicador.cl: {error}")
                continue
        all_points.extend(payload.get("serie", []))

    save_json(raw_path, {"source": "mindicador.cl", "serie": all_points})
    frame = pd.DataFrame(all_points)
    frame = frame.rename(columns={"fecha": "fecha", "valor": "valor"})
    frame["fecha"] = pd.to_datetime(frame["fecha"], errors="coerce")
    return frame[["fecha", "valor"]].dropna(subset=["fecha"])


def _fetch_cmf_history(resource: str, api_key: str, start_year: int, raw_path: Path) -> pd.DataFrame:
    current_year = datetime.utcnow().year
    all_points: list[dict[str, Any]] = []
    session = _build_session()

    for year in range(start_year, current_year + 1):
        info(f"Descargando {resource} desde CMF para {year}")
        response = session.get(
            f"{CMF_BASE_URL}/{resource}/{year}",
            params={"apikey": api_key, "formato": "json"},
            timeout=(15, 60),
        )
        response.raise_for_status()
        payload = response.json()
        all_points.extend(_extract_cmf_points(payload))

    save_json(raw_path, {"source": "cmf", "serie": all_points})

    frame = pd.DataFrame(all_points)
    if frame.empty:
        return pd.DataFrame(columns=["fecha", "valor"])

    fecha_column = "Fecha" if "Fecha" in frame.columns else "fecha"
    valor_column = "Valor" if "Valor" in frame.columns else "valor"
    frame = frame.rename(columns={fecha_column: "fecha", valor_column: "valor"})
    frame["fecha"] = pd.to_datetime(frame["fecha"], errors="coerce")
    return frame[["fecha", "valor"]].dropna(subset=["fecha"])


def _load_series(
    variable: str,
    preferred_resource: str,
    mindicador_code: str,
    monthly_method: str,
    raw_dir: Path,
    start_year: int = 2009,
) -> SeriesResult:
    api_key = os.getenv("CMF_API_KEY")
    raw_path = raw_dir / f"{variable}.json"

    try:
        if api_key:
            raw_frame = _fetch_cmf_history(preferred_resource, api_key, start_year, raw_path)
            source_name = "CMF"
            source_url = f"{CMF_BASE_URL}/{preferred_resource}"
            notes = "Serie descargada desde la API CMF Bancos usando CMF_API_KEY."
        else:
            raw_frame = _fetch_mindicador_history(mindicador_code, start_year, raw_path)
            source_name = "mindicador.cl"
            source_url = f"{MINDICADOR_BASE_URL}/{mindicador_code}"
            notes = "Serie descargada desde mindicador.cl. El adaptador CMF queda preparado para activarse con CMF_API_KEY."
    except Exception as error:
        if api_key:
            info(f"CMF fallo para {variable}; usando fallback mindicador.cl. Detalle: {error}")
            raw_frame = _fetch_mindicador_history(mindicador_code, start_year, raw_path)
            source_name = "mindicador.cl (fallback desde CMF)"
            source_url = f"{MINDICADOR_BASE_URL}/{mindicador_code}"
            notes = f"CMF_API_KEY estaba configurada, pero la descarga fallo y se uso mindicador.cl como fallback. Detalle: {error}"
        else:
            raise

    raw_frequency = detect_frequency(raw_frame["fecha"])
    monthly = monthly_aggregate(raw_frame, variable=variable, method=monthly_method)

    return SeriesResult(
        variable=variable,
        data=monthly,
        source_name=source_name,
        source_url=source_url,
        is_real=True,
        notes=notes,
        raw_frequency=raw_frequency,
        monthly_method=monthly_method,
    )


def fetch_uf_history(raw_dir: Path) -> SeriesResult:
    return _load_series(
        variable="uf",
        preferred_resource="uf",
        mindicador_code="uf",
        monthly_method="last",
        raw_dir=raw_dir,
    )


def fetch_usdclp_history(raw_dir: Path) -> SeriesResult:
    return _load_series(
        variable="usdclp",
        preferred_resource="dolar",
        mindicador_code="dolar",
        monthly_method="mean",
        raw_dir=raw_dir,
    )

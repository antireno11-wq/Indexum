from __future__ import annotations

import warnings
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup
from urllib3.exceptions import InsecureRequestWarning

from src.transform import SeriesResult, parse_english_month_label, parse_number, save_bytes, save_text


warnings.simplefilter("ignore", InsecureRequestWarning)


IPC_XLSX_URL = (
    "https://www.ine.gob.cl/docs/default-source/%C3%ADndice-de-precios-al-consumidor/"
    "cuadros-estadisticos/base-anual-2023_100/series-de-tiempo/ipc-xls.xlsx"
)
INE_STAT_BASE_URL = "https://stat.ine.cl/Index.aspx?DataSetCode={code}"


def _load_ipc_base_2023() -> pd.DataFrame:
    frame = pd.read_excel(IPC_XLSX_URL, sheet_name="IPC 2023=100", header=3)
    return frame.rename(columns=lambda value: str(value).strip())


def _build_month_column(frame: pd.DataFrame) -> pd.Series:
    return pd.to_datetime(
        frame["Año"].astype(int).astype(str) + "-" + frame["Mes"].astype(int).astype(str).str.zfill(2) + "-01",
        errors="coerce",
    ).dt.strftime("%Y-%m")


def _division_level_rows(frame: pd.DataFrame) -> pd.DataFrame:
    return frame[
        frame["División"].notna()
        & frame["Grupo"].isna()
        & frame["Clase"].isna()
        & frame["Subclase"].isna()
        & frame["Producto"].isna()
    ].copy()


def _series_from_ipc_frame(frame: pd.DataFrame, variable: str, mask: pd.Series, notes: str) -> SeriesResult:
    subset = frame.loc[mask, ["fecha", "Índice"]].copy()
    subset = subset.rename(columns={"Índice": "valor"})
    subset = subset.dropna(subset=["fecha"]).sort_values("fecha").drop_duplicates(subset=["fecha"], keep="last")

    return SeriesResult(
        variable=variable,
        data=subset.assign(nombre_variable=variable)[["fecha", "nombre_variable", "valor"]],
        source_name="INE",
        source_url=IPC_XLSX_URL,
        is_real=True,
        notes=notes,
        raw_frequency="mensual",
        monthly_method="official_monthly",
    )


def fetch_ipc_components(raw_dir: Path) -> list[SeriesResult]:
    response = requests.get(IPC_XLSX_URL, timeout=30)
    response.raise_for_status()
    save_bytes(raw_dir / "ipc_ine.xlsx", response.content)

    frame = _load_ipc_base_2023()
    frame["fecha"] = _build_month_column(frame)
    division_rows = _division_level_rows(frame)

    general_mask = frame["Glosa"].eq("IPC General") & frame["División"].isna()
    alimentos_mask = division_rows["Glosa"].eq("ALIMENTOS Y BEBIDAS NO ALCOHÓLICAS")
    vivienda_mask = division_rows["Glosa"].eq("VIVIENDA Y SERVICIOS BÁSICOS")

    return [
        _series_from_ipc_frame(
            frame,
            variable="ipc_general",
            mask=general_mask,
            notes="IPC general oficial desde el archivo estadístico INE base anual 2023=100.",
        ),
        _series_from_ipc_frame(
            division_rows,
            variable="ipc_alimentos",
            mask=alimentos_mask,
            notes="División 'Alimentos y bebidas no alcohólicas' desde el archivo estadístico INE base anual 2023=100.",
        ),
        _series_from_ipc_frame(
            division_rows,
            variable="ipc_vivienda_servicios_basicos",
            mask=vivienda_mask,
            notes="División 'Vivienda y servicios básicos' desde el archivo estadístico INE base anual 2023=100.",
        ),
    ]


def _fetch_ine_stat_series(dataset_code: str, variable: str, raw_dir: Path, notes: str) -> SeriesResult:
    url = INE_STAT_BASE_URL.format(code=dataset_code)
    response = requests.get(url, timeout=30, verify=False)
    response.raise_for_status()
    save_text(raw_dir / f"{variable}.html", response.text)

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table", {"class": "DataTable"})

    if table is None:
        raise RuntimeError(f"No fue posible encontrar la tabla de datos para {dataset_code}.")

    rows = []
    for tr in table.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all(["th", "td"])]
        if len(cells) >= 3 and cells[0] not in {"Month", ""} and cells[2] != "":
            rows.append({"fecha": parse_english_month_label(cells[0]), "valor": parse_number(cells[2])})

    frame = pd.DataFrame(rows).drop_duplicates(subset=["fecha"]).sort_values("fecha")

    return SeriesResult(
        variable=variable,
        data=frame.assign(nombre_variable=variable)[["fecha", "nombre_variable", "valor"]],
        source_name="INE.Stat",
        source_url=url,
        is_real=True,
        notes=notes,
        raw_frequency="mensual",
        monthly_method="official_monthly",
    )


def fetch_remuneration_index(raw_dir: Path) -> SeriesResult:
    return _fetch_ine_stat_series(
        dataset_code="IR_IR_EM",
        variable="indice_remuneraciones",
        raw_dir=raw_dir,
        notes="Serie empalmada del índice nominal de remuneraciones descargada desde INE.Stat.",
    )


def fetch_labour_cost_index(raw_dir: Path) -> SeriesResult:
    return _fetch_ine_stat_series(
        dataset_code="IR_ECMO_EM",
        variable="indice_costos_laborales",
        raw_dir=raw_dir,
        notes="Serie empalmada del índice nominal de costos laborales descargada desde INE.Stat.",
    )

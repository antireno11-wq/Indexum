from __future__ import annotations

from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

from src.transform import (
    SeriesResult,
    detect_frequency,
    parse_number,
    parse_spanish_month_token,
    save_text,
)


INDICADORES_DIARIOS_URL = "https://si3.bcentral.cl/indicadoressiete/secure/indicadoresdiarios.aspx"
IMCE_EXPECTATIONS_URL = "https://si3.bcentral.cl/Siete/ES/Siete/Cuadro/CAP_DYB/MN_EXP_EC11/EXE_IMCE_COMER/EXE_IMCE_COMER"
IMACEC_PUBLIC_URL = (
    "https://si3.bcentral.cl/indicadoressiete/secure/Serie.aspx?"
    "gcode=IMC_EP03_YTYPCT&"
    "param=TwBiAFUARwBXAGIAbQB3AE4ALQA5AEsAdwAjAE0ATQBBAEsAZgBrADUAaAAxAF8AdQBTAHoAMgAyAHgAWABvAFAAOAAuAFoAQgBCAHoAcABTAHIAQgBpAHQAMABzAHQAMwBRAGwATgBNAEEASgBnAHgAQQBWAFIAdQAuADMAYgBzAGQAYwBPAHgAcQBIAGYAOAB3AFYAQQBuAGQATwA5AEUAYwBKADQAVwBUAEwAYwB5AFMAbgBNADEASwBkAG8AdABCADkAdQB1AHkAQQBTAFAA"
)


def _request_html(url: str, raw_path: Path) -> BeautifulSoup:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    save_text(raw_path, response.text)
    return BeautifulSoup(response.text, "html.parser")


def _extract_imacec_series_url() -> str:
    return IMACEC_PUBLIC_URL


def fetch_imacec_history(raw_dir: Path) -> SeriesResult:
    imacec_url = _extract_imacec_series_url()
    soup = _request_html(imacec_url, raw_dir / "imacec_bcentral.html")
    table = soup.find("table", {"id": "gr"})

    if table is None:
        raise RuntimeError("La tabla pública de Imacec no fue encontrada.")

    headers = [header.get_text(" ", strip=True) for header in table.find_all("th")]
    month_headers = headers[1:]

    rows: list[dict[str, object]] = []
    for tr in table.find_all("tr")[1:]:
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if not cells:
            continue
        year = cells[0]
        for month_index, value in enumerate(cells[1:], start=1):
            if value == "":
                continue
            date = pd.Timestamp(year=int(year), month=month_index, day=1)
            rows.append({"fecha": date, "valor": parse_number(value)})

    frame = pd.DataFrame(rows).dropna(subset=["fecha"]).sort_values("fecha")
    frame["fecha"] = frame["fecha"].dt.strftime("%Y-%m")

    return SeriesResult(
        variable="imacec",
        data=frame.assign(nombre_variable="imacec")[["fecha", "nombre_variable", "valor"]],
        source_name="Banco Central de Chile",
        source_url=imacec_url,
        is_real=True,
        notes="Serie pública mensual de Imacec descargada desde el portal de indicadores diarios del Banco Central. Corresponde a la variación anual (%) visible en la serie pública.",
        raw_frequency="mensual",
        monthly_method="official_monthly",
    )


def fetch_inflation_expectations_12m(raw_dir: Path) -> SeriesResult:
    soup = _request_html(IMCE_EXPECTATIONS_URL, raw_dir / "inflacion_esperada_12m_bcentral.html")
    table = soup.find("table", {"id": "grilla"})

    if table is None:
        raise RuntimeError("La tabla pública de expectativas de inflación no fue encontrada.")

    headers = [header.get_text(" ", strip=True) for header in table.find("thead").find_all("th")]
    date_headers = headers[2:]

    target_row = None
    for tr in table.find("tbody").find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) >= 2 and "Expectativas - Inflación esperada 12 meses" in cells[1]:
            target_row = cells
            break

    if target_row is None:
        raise RuntimeError("No fue posible encontrar la fila de inflación esperada a 12 meses.")

    rows = []
    for token, value in zip(date_headers, target_row[2:]):
        if value == "":
            continue
        rows.append({"fecha": parse_spanish_month_token(token), "valor": parse_number(value)})

    frame = pd.DataFrame(rows).drop_duplicates(subset=["fecha"]).sort_values("fecha")

    return SeriesResult(
        variable="inflacion_esperada_12m",
        data=frame.assign(nombre_variable="inflacion_esperada_12m")[["fecha", "nombre_variable", "valor"]],
        source_name="Banco Central de Chile",
        source_url=IMCE_EXPECTATIONS_URL,
        is_real=True,
        notes="Serie mensual obtenida desde la tabla pública del Banco Central para IMCE Comercio, fila 'Expectativas - Inflación esperada 12 meses'. Se usa como proxy oficial y pública de expectativas a 12 meses.",
        raw_frequency="mensual",
        monthly_method="official_monthly",
    )

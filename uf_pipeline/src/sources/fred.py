from __future__ import annotations

from io import StringIO
from pathlib import Path

import pandas as pd
import requests

from src.transform import SeriesResult, detect_frequency, monthly_aggregate, save_text


FRED_BRENT_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DCOILBRENTEU"


def fetch_brent_history(raw_dir: Path) -> SeriesResult:
    response = requests.get(FRED_BRENT_URL, timeout=30)
    response.raise_for_status()
    save_text(raw_dir / "brent_fred.csv", response.text)

    frame = pd.read_csv(StringIO(response.text))
    date_column = "DATE" if "DATE" in frame.columns else "observation_date"
    value_column = "DCOILBRENTEU"
    frame = frame.rename(columns={date_column: "fecha", value_column: "valor"})
    frame["fecha"] = pd.to_datetime(frame["fecha"], errors="coerce")
    frame["valor"] = pd.to_numeric(frame["valor"], errors="coerce")
    frame = frame.dropna(subset=["fecha"])

    monthly = monthly_aggregate(frame, variable="brent", method="mean")

    return SeriesResult(
        variable="brent",
        data=monthly,
        source_name="FRED",
        source_url=FRED_BRENT_URL,
        is_real=True,
        notes="Serie diaria Brent Europa desde FRED, agregada a promedio mensual.",
        raw_frequency=detect_frequency(frame["fecha"]),
        monthly_method="mean",
    )

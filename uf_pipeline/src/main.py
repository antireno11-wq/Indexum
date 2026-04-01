from __future__ import annotations

from pathlib import Path
import sys
import warnings

from urllib3.exceptions import InsecureRequestWarning, NotOpenSSLWarning

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

warnings.filterwarnings("ignore", category=InsecureRequestWarning)
warnings.filterwarnings("ignore", category=NotOpenSSLWarning)

from src.merge import merge_series, print_dataset_summary, print_series_summary
from src.sources.bcentral import fetch_imacec_history, fetch_inflation_expectations_12m
from src.sources.cmf import fetch_uf_history, fetch_usdclp_history
from src.sources.fred import fetch_brent_history
from src.sources.ine import fetch_ipc_components, fetch_labour_cost_index, fetch_remuneration_index
from src.transform import info


def main() -> None:
    project_dir = PROJECT_DIR
    raw_dir = project_dir / "data" / "raw"
    processed_dir = project_dir / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    info("Iniciando pipeline de datos para UF")

    results = [
        fetch_uf_history(raw_dir),
        *fetch_ipc_components(raw_dir),
        fetch_inflation_expectations_12m(raw_dir),
        fetch_usdclp_history(raw_dir),
        fetch_brent_history(raw_dir),
        fetch_remuneration_index(raw_dir),
        fetch_labour_cost_index(raw_dir),
        fetch_imacec_history(raw_dir),
    ]

    print_series_summary(results)

    dataset = merge_series(results)
    output_path = processed_dir / "uf_macro_dataset.csv"
    dataset.to_csv(output_path, index=False)

    print_dataset_summary(dataset)
    info(f"CSV final guardado en {output_path}")


if __name__ == "__main__":
    main()

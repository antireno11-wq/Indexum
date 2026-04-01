# UF Data Pipeline

Proyecto simple en Python para obtener, limpiar y consolidar series mensuales útiles para proyectar la `UF` en Chile.

## Qué hace

- descarga series desde fuentes públicas u oficiales
- normaliza todo a frecuencia mensual
- consolida un dataset final en CSV
- imprime validaciones simples en consola

## Estructura

```text
uf_pipeline/
  src/
    sources/
      cmf.py
      bcentral.py
      ine.py
      fred.py
    transform.py
    merge.py
    main.py
  data/
    raw/
    processed/
  requirements.txt
  README.md
```

## Cómo correrlo

```bash
cd uf_pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/main.py
```

El archivo final queda en:

```text
data/processed/uf_macro_dataset.csv
```

## Variables consolidadas

- `uf`
- `ipc_general`
- `ipc_alimentos`
- `ipc_vivienda_servicios_basicos`
- `inflacion_esperada_12m`
- `usdclp`
- `brent`
- `indice_remuneraciones`
- `indice_costos_laborales`
- `imacec`

## Notas de fuente

- `uf` y `usdclp`: el adaptador prioriza `CMF` si existe `CMF_API_KEY`; si no, usa `mindicador.cl`.
- `ipc_*`: hoy se descargan desde el archivo estadístico oficial del `INE` base anual `2023=100`.
- `inflacion_esperada_12m`: hoy se obtiene desde una tabla pública del `Banco Central` en BDE, usando la fila `Expectativas - Inflación esperada 12 meses` de `IMCE Comercio`.
- `indice_remuneraciones` y `indice_costos_laborales`: se obtienen desde `INE.Stat`.
- `imacec`: se obtiene desde la serie pública del `Banco Central` visible en indicadores diarios.

## Limitaciones conocidas

- Las subseries de IPC por división hoy quedan acotadas al tramo disponible en el archivo oficial base `2023=100`.
- La serie `inflacion_esperada_12m` usa una serie pública mensual del Banco Central que sirve como proxy operativo; si después quieres una serie distinta como `EEE` o `EOF`, el pipeline ya queda estructurado para reemplazar ese adaptador.

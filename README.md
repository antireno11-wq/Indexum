# Proyeccion de Indicadores

MVP web construido con Next.js, React, TypeScript, Tailwind y Recharts para visualizar indicadores ejecutivos. Hoy incluye `USD/CLP`, `UF` y `Diesel`, con historico real para los indicadores conectados a fuentes publicas.

## Como levantarlo

```bash
npm install
npm run dev
```

Luego abre [http://localhost:3000](http://localhost:3000).

Para habilitar la serie historica mensual del diesel via API CNE:

```bash
export CNE_API_TOKEN=tu_token_bearer
```

Tambien puedes copiar el ejemplo:

```bash
cp .env.local.example .env.local
```

## Estructura breve

- `app/`: layout global y pagina principal con App Router.
- `components/`: bloques reutilizables del dashboard.
- `data/`: catalogo base de indicadores y metadatos.
- `types/`: contratos tipados para indicadores y estados de visualizacion.
- `utils/`: formato, integraciones con `mindicador.cl` y `Bencina en Linea`, y calculos de forecast derivados del historico real.

## Alcance del MVP

- Selector de indicador `Dolar / UF / Diesel`
- Header con estado Beta
- 4 metricas principales
- Filtro por horizonte `12 / 24 / 60 meses`
- Integracion de valor actual e historico real con `mindicador.cl` para `USD/CLP` y `UF`
- Grafico con historico real, forecast mensual y escenarios `base / optimista / estres`
- Panel de supuestos usados por la metodologia
- Resumen Ejecutivo generado desde datos observados y proyeccion derivada
- Tabla mensual consolidada con historico y escenarios
- Forecast construido sobre la serie real, sin dataset mock fijo
- Vista de Diesel conectada a la API CNE para serie mensual nacional cuando existe `CNE_API_TOKEN`

## Siguiente fase sugerida

1. Conectar APIs reales para series historicas y variables macro.
2. Robustecer la metodologia de forecast con variables macro externas y backtesting.
3. Agregar una capa IA para generar explicaciones, alertas y justificaciones dinamicas sobre datos reales.
4. Extender el catalogo a indicadores como inflacion, energia, combustible y amoniaco reutilizando la misma estructura.

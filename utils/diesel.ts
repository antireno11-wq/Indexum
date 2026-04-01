import type { DieselRegionPoint, DieselSnapshot } from "@/types/indicator";

type RegionalDieselApiPoint = {
  cod_region: string;
  nom_region: string;
  orden: number;
  zona_geografica_id: number;
  zona_geografic_nombre: string;
  precio_promedio: string;
};

type RegionalDieselApiResponse = {
  data: RegionalDieselApiPoint[];
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function fetchRegionalDieselPrices(combustibleId: 3 | 11) {
  const response = await fetch(`https://api.bencinaenlinea.cl/api/estaciones/precios_combustibles/${combustibleId}/reporte_regional`);

  if (!response.ok) {
    throw new Error(`Bencina en Linea responded with ${response.status} for diesel report ${combustibleId}`);
  }

  return (await response.json()) as RegionalDieselApiResponse;
}

export async function fetchDieselSnapshot(): Promise<DieselSnapshot> {
  const [assisted, selfService] = await Promise.all([
    fetchRegionalDieselPrices(3),
    fetchRegionalDieselPrices(11),
  ]);

  const regionMap = new Map<string, DieselRegionPoint & { samples: number[] }>();

  for (const point of [...assisted.data, ...selfService.data]) {
    const current = regionMap.get(point.cod_region);
    const price = Number(point.precio_promedio);

    if (!current) {
      regionMap.set(point.cod_region, {
        regionCode: point.cod_region,
        regionName: point.nom_region,
        order: point.orden,
        zoneId: point.zona_geografica_id,
        zoneName: point.zona_geografic_nombre,
        price,
        samples: [price],
      });
      continue;
    }

    current.samples.push(price);
    current.price = average(current.samples);
  }

  const regions = Array.from(regionMap.values())
    .map(({ samples: _samples, ...region }) => region)
    .sort((left, right) => left.order - right.order);

  if (regions.length === 0) {
    throw new Error("No diesel regional prices were returned by Bencina en Linea");
  }

  const prices = regions.map((region) => region.price);
  const minRegion = regions.reduce((min, region) => (region.price < min.price ? region : min), regions[0]);
  const maxRegion = regions.reduce((max, region) => (region.price > max.price ? region : max), regions[0]);

  return {
    nationalAverage: average(prices),
    spread: maxRegion.price - minRegion.price,
    minRegion,
    maxRegion,
    regions,
    lastUpdated: new Date().toISOString(),
  };
}

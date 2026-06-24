import { apiFetch } from "@/lib/uex/client";
import type {
  Commodity,
  PriceListing,
  Terminal,
  UexMarketData,
  UexOrbitDistance,
  UexVehicle,
} from "@/lib/uex/types";

export function fetchCommodities(): Promise<Commodity[]> {
  return apiFetch<Commodity[]>("commodities");
}

export function fetchTerminals(): Promise<Terminal[]> {
  return apiFetch<Terminal[]>("terminals");
}

export function fetchCommoditiesPricesAll(): Promise<PriceListing[]> {
  return apiFetch<PriceListing[]>("commodities_prices_all");
}

export function fetchOrbitDistancesForSystems(
  originSystemId: number,
  destinationSystemId: number,
): Promise<UexOrbitDistance[]> {
  return apiFetch<UexOrbitDistance[]>(
    `orbits_distances?id_star_system_origin=${originSystemId}&id_star_system_destination=${destinationSystemId}`,
  );
}

export function fetchVehicles(): Promise<UexVehicle[]> {
  return apiFetch<UexVehicle[]>("vehicles");
}

export async function fetchCargoVehiclesForShips(): Promise<
  { name: string; slug?: string; scu: number }[]
> {
  const vehicles = await fetchVehicles();
  return vehicles
    .filter((v) => v.is_cargo === 1 && v.is_spaceship === 1 && v.scu > 0)
    .map((v) => ({ name: v.name, slug: v.slug, scu: v.scu }));
}

export async function fetchMarketDataBundle(): Promise<UexMarketData> {
  const [prices, terminals, commodities] = await Promise.all([
    fetchCommoditiesPricesAll(),
    fetchTerminals(),
    fetchCommodities(),
  ]);

  return {
    prices,
    terminals,
    commodities,
    fetchedAt: new Date().toISOString(),
  };
}

export interface UexApiResponse<T> {
  status: string;
  data: T;
}

export interface Commodity {
  id: number;
  name: string;
  code: string;
  is_illegal: 0 | 1;
  is_volatile_qt: 0 | 1;
  is_buyable: 0 | 1;
  is_sellable: 0 | 1;
  weight_scu?: number;
}

export interface Terminal {
  id: number;
  id_star_system: number;
  id_orbit: number;
  nickname: string | null;
  name: string;
  star_system_name: string | null;
  planet_name: string | null;
  moon_name: string | null;
  orbit_name: string | null;
  city_name: string | null;
  outpost_name: string | null;
  space_station_name: string | null;
  is_cargo_center: 0 | 1;
  has_freight_elevator: 0 | 1;
  has_loading_dock: 0 | 1;
  has_docking_port: 0 | 1;
  is_refuel: 0 | 1;
  is_repair: 0 | 1;
  is_nqa: 0 | 1;
  max_container_size: number;
}

export interface PriceListing {
  id: number;
  id_commodity: number;
  id_terminal: number;
  price_buy: number;
  price_buy_avg: number;
  price_sell: number;
  price_sell_avg: number;
  scu_buy: number;
  scu_buy_avg: number;
  scu_sell: number;
  scu_sell_avg: number;
  scu_sell_stock: number;
  scu_sell_stock_avg: number;
  status_buy: number | null;
  status_sell: number | null;
  commodity_name?: string;
  terminal_name?: string;
}

/** @deprecated Use Commodity */
export type UexCommodity = Commodity;

/** @deprecated Use Terminal */
export type UexTerminal = Terminal;

/** @deprecated Use PriceListing */
export type UexCommodityPrice = PriceListing;

export interface UexOrbitDistance {
  id_orbit_origin: number;
  id_orbit_destination: number;
  id_star_system_origin: number;
  id_star_system_destination: number;
  distance: string | number;
  orbit_origin_name?: string | null;
  orbit_destination_name?: string | null;
}

export type OrbitDistanceMap = Record<string, number>;

export interface UexMarketData {
  commodities: Commodity[];
  terminals: Terminal[];
  prices: PriceListing[];
  fetchedAt: string;
}

export type UexConnectionStatus = "idle" | "loading" | "online" | "stale" | "offline";

export interface UexVehicle {
  id: number;
  name: string;
  slug: string;
  scu: number;
  is_cargo: 0 | 1;
  is_spaceship: 0 | 1;
}

export type { TradingShip as Ship, QuantumSpeedClass } from "@/lib/trading-routes/ships";

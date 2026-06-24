import { TOP_OFFERS_PER_LEG } from "@/lib/trading-routes/constants";
import type { RoutePairBuildFilters, TradePairsBuildResult, TradeRouteMarketInput } from "@/lib/trading-routes/types";
import type {
  SellAlternative,
  TerminalSnapshot,
  TradingRouteCandidate,
} from "@/types/trading-route";
import type { Commodity, PriceListing, Terminal } from "@/lib/uex/types";

interface InternalOffer extends TerminalSnapshot {
  commodityId: number;
  commodityName: string;
  commodityCode: string;
  isIllegal: boolean;
  isVolatileQt: boolean;
  price: number;
  priceAvg: number;
  scu: number;
  scuStock?: number;
  status?: number | null;
}

function terminalLabel(term: Terminal): string {
  return term.nickname || term.name || "Unknown";
}

function buildLocation(term: Terminal, termName: string): { location: string; planet: string } {
  const planet = term.planet_name || term.moon_name || "";
  const orbit = term.orbit_name || "";
  const system = term.star_system_name || "";
  const city = term.city_name || "";
  const outpost = term.outpost_name || "";
  const station = term.space_station_name || "";

  const locParts = [termName];
  if (city) locParts.push(city);
  else if (outpost) locParts.push(outpost);
  else if (station) locParts.push(station);
  if (planet) locParts.push(planet);

  const planetLabel = planet || orbit || station || system;

  return { location: locParts.join(", "), planet: planetLabel };
}

function terminalSnapshot(term: Terminal, termName: string): TerminalSnapshot {
  const { location, planet } = buildLocation(term, termName);
  return {
    terminalId: term.id,
    terminal: termName,
    location,
    planet,
    system: term.star_system_name || "",
    systemId: term.id_star_system || 0,
    orbitId: term.id_orbit || 0,
    hasCargoCenter: term.is_cargo_center === 1,
    hasFreightElevator: term.has_freight_elevator === 1,
    hasLoadingDock: term.has_loading_dock === 1,
    hasDockingPort: term.has_docking_port === 1,
    isRefuel: term.is_refuel === 1,
    isNqa: term.is_nqa === 1,
    maxContainerSize: term.max_container_size || 0,
  };
}

function matchesBuildFilters(offer: InternalOffer, filters?: RoutePairBuildFilters): boolean {
  if (!filters) return true;
  if (filters.excludeIllegal && offer.isIllegal) return false;
  if (filters.commodityIds?.length && !filters.commodityIds.includes(offer.commodityId)) {
    return false;
  }
  if (filters.systems?.length) {
    const allowed = new Set(filters.systems);
    if (!allowed.has(offer.system)) return false;
  }
  return true;
}

function matchesSellStock(sell: InternalOffer, minSellStock?: number): boolean {
  if (minSellStock == null || minSellStock <= 0) return true;
  return (sell.scuStock ?? 0) >= minSellStock;
}

export function buildTradePairs(
  market: TradeRouteMarketInput,
  filters?: RoutePairBuildFilters,
): TradePairsBuildResult {
  const { prices, terminals, commodities } = market;
  const termMap = new Map(terminals.map((t) => [t.id, t]));
  const commMap = new Map(commodities.map((c) => [c.id, c]));

  const buyOffers: InternalOffer[] = [];
  const sellOffers: InternalOffer[] = [];

  for (const p of prices) {
    const term = termMap.get(p.id_terminal);
    const comm = commMap.get(p.id_commodity);
    if (!term || !comm) continue;
    if (filters?.excludeIllegal && comm.is_illegal === 1) continue;
    if (filters?.commodityIds?.length && !filters.commodityIds.includes(p.id_commodity)) {
      continue;
    }

    const termName = terminalLabel(term);
    const base = terminalSnapshot(term, termName);
    const commodityName = comm.name || p.commodity_name || "Unknown";
    const commodityCode = comm.code || "";

    const shared = {
      commodityId: p.id_commodity,
      commodityName,
      commodityCode,
      isIllegal: comm.is_illegal === 1,
      isVolatileQt: comm.is_volatile_qt === 1,
      ...base,
    };

    if (!matchesBuildFilters(shared as InternalOffer, filters)) continue;

    if (p.price_buy > 0 && p.scu_buy > 0) {
      buyOffers.push({
        ...shared,
        price: p.price_buy,
        priceAvg: p.price_buy_avg,
        scu: p.scu_buy,
        status: p.status_buy,
      });
    }

    if (p.price_sell > 0 && p.scu_sell > 0) {
      sellOffers.push({
        ...shared,
        price: p.price_sell,
        priceAvg: p.price_sell_avg,
        scu: p.scu_sell,
        scuStock: p.scu_sell_stock,
        status: p.status_sell,
      });
    }
  }

  const buyBy = new Map<number, InternalOffer[]>();
  const sellBy = new Map<number, InternalOffer[]>();

  for (const b of buyOffers) {
    const list = buyBy.get(b.commodityId) ?? [];
    list.push(b);
    buyBy.set(b.commodityId, list);
  }

  for (const s of sellOffers) {
    const list = sellBy.get(s.commodityId) ?? [];
    list.push(s);
    sellBy.set(s.commodityId, list);
  }

  const candidates: TradingRouteCandidate[] = [];

  for (const [commodityId, buys] of buyBy) {
    const sells = sellBy.get(commodityId);
    if (!sells?.length) continue;

    buys.sort((a, b) => a.price - b.price);
    sells.sort((a, b) => b.price - a.price);

    for (const buy of buys.slice(0, TOP_OFFERS_PER_LEG)) {
      for (const sell of sells.slice(0, TOP_OFFERS_PER_LEG)) {
        if (buy.terminalId === sell.terminalId) continue;
        if (sell.price - buy.price <= 0) continue;
        if (!matchesSellStock(sell, filters?.minSellStock)) continue;

        candidates.push({
          commodityId,
          commodity: buy.commodityName,
          commodityCode: buy.commodityCode,
          isIllegal: buy.isIllegal,
          isVolatileQt: buy.isVolatileQt,
          buy: {
            terminalId: buy.terminalId,
            terminal: buy.terminal,
            location: buy.location,
            planet: buy.planet,
            system: buy.system,
            systemId: buy.systemId,
            orbitId: buy.orbitId,
            hasCargoCenter: buy.hasCargoCenter,
            hasFreightElevator: buy.hasFreightElevator,
            hasLoadingDock: buy.hasLoadingDock,
            hasDockingPort: buy.hasDockingPort,
            isRefuel: buy.isRefuel,
            isNqa: buy.isNqa,
            maxContainerSize: buy.maxContainerSize,
            price: buy.price,
            priceAvg: buy.priceAvg,
            scu: buy.scu,
            status: buy.status,
          },
          sell: {
            terminalId: sell.terminalId,
            terminal: sell.terminal,
            location: sell.location,
            planet: sell.planet,
            system: sell.system,
            systemId: sell.systemId,
            orbitId: sell.orbitId,
            hasCargoCenter: sell.hasCargoCenter,
            hasFreightElevator: sell.hasFreightElevator,
            hasLoadingDock: sell.hasLoadingDock,
            hasDockingPort: sell.hasDockingPort,
            isRefuel: sell.isRefuel,
            isNqa: sell.isNqa,
            maxContainerSize: sell.maxContainerSize,
            price: sell.price,
            priceAvg: sell.priceAvg,
            scu: sell.scu,
            scuStock: sell.scuStock,
            status: sell.status,
          },
        });
      }
    }
  }

  const sellAlternatives: Record<number, SellAlternative[]> = {};

  for (const [cid, sells] of sellBy) {
    sellAlternatives[cid] = sells
      .sort((a, b) => b.price - a.price)
      .map((s) => ({
        terminalId: s.terminalId,
        terminal: s.terminal,
        location: s.location,
        planet: s.planet,
        system: s.system,
        price: s.price,
        scu: s.scu,
        scuStock: s.scuStock ?? 0,
        hasCargoCenter: s.hasCargoCenter,
      }));
  }

  return { candidates, sellAlternatives };
}

/** Legacy signature: prices, terminals, commodities as separate args. */
export function buildTradePairsFromArrays(
  prices: PriceListing[],
  terminals: Terminal[],
  commodities: Commodity[],
  filters?: RoutePairBuildFilters,
): TradePairsBuildResult {
  return buildTradePairs({ prices, terminals, commodities }, filters);
}

import type { TradingLoopRoute, TradingRouteFilters } from "@/types/trading-route";

function compareLoopRoutes(
  a: TradingLoopRoute,
  b: TradingLoopRoute,
  sort: TradingRouteFilters["sort"],
): number {
  switch (sort) {
    case "total-profit":
      return b.grossProfit - a.grossProfit;
    case "profit-per-scu":
      return b.profitPerScu - a.profitPerScu;
    case "roi":
      return b.roiPercent - a.roiPercent;
    case "profit-per-min":
      return b.profitPerMin - a.profitPerMin;
    case "time":
      return a.time.total - b.time.total;
    case "buy-price":
      return a.totalCost - b.totalCost;
    default:
      return b.grossProfit - a.grossProfit;
  }
}

function loopSystems(route: TradingLoopRoute): string[] {
  const systems = new Set<string>();
  for (const leg of route.legs) {
    if (leg.buy.system) systems.add(leg.buy.system);
    if (leg.sell.system) systems.add(leg.sell.system);
  }
  return [...systems];
}

function loopCommodities(route: TradingLoopRoute): string[] {
  return route.legs.map((l) => l.commodity);
}

export function filterTradingLoopRoutes(
  routes: TradingLoopRoute[],
  filters: TradingRouteFilters,
): TradingLoopRoute[] {
  let result = routes.filter((r) => r.grossProfit > 0 && r.effectiveScu > 0);

  const system = filters.system?.trim();
  if (system) {
    result = result.filter((r) => loopSystems(r).includes(system));
  }

  const commodity = filters.commodity?.trim();
  if (commodity) {
    result = result.filter((r) => loopCommodities(r).includes(commodity));
  }

  if (filters.legality === "legal") {
    result = result.filter((r) => !r.isIllegal);
  } else if (filters.legality === "illegal") {
    result = result.filter((r) => r.isIllegal);
  }

  if (filters.sameSystem === "yes") {
    result = result.filter((r) => {
      const systems = loopSystems(r);
      return systems.length === 1;
    });
  }

  if (filters.cargoCenter === "both") {
    result = result.filter((r) =>
      r.legs.every((leg) => leg.buy.hasCargoCenter && leg.sell.hasCargoCenter),
    );
  } else if (filters.cargoCenter === "buy") {
    result = result.filter((r) => r.legs.every((leg) => leg.buy.hasCargoCenter));
  } else if (filters.cargoCenter === "sell") {
    result = result.filter((r) => r.legs.every((leg) => leg.sell.hasCargoCenter));
  }

  return [...result].sort((a, b) => compareLoopRoutes(a, b, filters.sort));
}

export function extractLoopFilterOptions(routes: TradingLoopRoute[]): {
  systems: string[];
  commodities: string[];
} {
  const systems = new Set<string>();
  const commodities = new Set<string>();

  for (const r of routes) {
    for (const leg of r.legs) {
      if (leg.buy.system) systems.add(leg.buy.system);
      if (leg.sell.system) systems.add(leg.sell.system);
      commodities.add(leg.commodity);
    }
  }

  return {
    systems: [...systems].sort(),
    commodities: [...commodities].sort(),
  };
}

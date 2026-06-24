import { applyFilters } from "@/lib/trading-routes/apply-filters";
import type { RouteFilterParams } from "@/lib/trading-routes/types";
import type { TradingRoute, TradingRouteFilters } from "@/types/trading-route";
import { hasAutoload, routeMatchesQuery } from "./route-filter-utils";

function compareRoutes(a: TradingRoute, b: TradingRoute, sort: TradingRouteFilters["sort"]): number {
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

function toRouteFilterParams(filters: TradingRouteFilters): RouteFilterParams {
  const params: RouteFilterParams = {};

  if (filters.legality === "legal" || filters.excludeVolatileQt) {
    params.excludeIllegal = filters.legality === "legal";
  }
  if (filters.legality === "illegal") {
    params.commodityTags = ["illegal"];
  }
  if (filters.sameSystem === "yes") params.sameSystem = true;
  if (filters.cargoCenter === "both") params.requireCargoCenter = true;
  if (filters.minStock != null && filters.minStock > 0) params.minStock = filters.minStock;

  const systems = new Set<string>();
  if (filters.system?.trim()) systems.add(filters.system.trim());
  if (filters.buySystem?.trim()) systems.add(filters.buySystem.trim());
  if (filters.sellSystem?.trim()) systems.add(filters.sellSystem.trim());
  if (systems.size > 0) params.systems = [...systems];

  return params;
}

function passesExtendedFilters(route: TradingRoute, filters: TradingRouteFilters): boolean {
  if (route.profitPerScu <= 0 || route.effectiveScu <= 0) return false;

  if (filters.buySystem?.trim() && route.buy.system !== filters.buySystem.trim()) return false;
  if (filters.sellSystem?.trim() && route.sell.system !== filters.sellSystem.trim()) return false;

  if (filters.system?.trim()) {
    const system = filters.system.trim();
    if (route.buy.system !== system && route.sell.system !== system) return false;
  }

  if (filters.commodity?.trim() && route.commodity !== filters.commodity.trim()) return false;

  if (filters.legality === "legal" && route.isIllegal) return false;
  if (filters.legality === "illegal" && !route.isIllegal) return false;

  if (filters.excludeVolatileQt && route.isVolatileQt) return false;

  if (filters.sameSystem === "yes" && route.buy.system !== route.sell.system) return false;

  if (filters.cargoCenter === "both" && (!route.buy.hasCargoCenter || !route.sell.hasCargoCenter)) {
    return false;
  }
  if (filters.cargoCenter === "buy" && !route.buy.hasCargoCenter) return false;
  if (filters.cargoCenter === "sell" && !route.sell.hasCargoCenter) return false;

  if (filters.autoloadOnly && (!hasAutoload(route.buy) || !hasAutoload(route.sell))) {
    return false;
  }

  if (filters.minContainerSize != null && filters.minContainerSize > 0) {
    const minBox = filters.minContainerSize;
    if (route.buy.maxContainerSize > 0 && route.buy.maxContainerSize < minBox) return false;
    if (route.sell.maxContainerSize > 0 && route.sell.maxContainerSize < minBox) return false;
  }

  if (filters.minSellStock != null && filters.minSellStock > 0) {
    const sellStock = route.sell.scuStock ?? route.sell.scu;
    if (sellStock < filters.minSellStock) return false;
  }

  if (filters.query?.trim() && !routeMatchesQuery(route, filters.query)) return false;

  return true;
}

export function filterTradingRoutes(
  routes: TradingRoute[],
  filters: TradingRouteFilters,
): TradingRoute[] {
  const params = toRouteFilterParams(filters);
  let result = applyFilters(routes, params).filter((r) => passesExtendedFilters(r, filters));
  return [...result].sort((a, b) => compareRoutes(a, b, filters.sort));
}

export function extractFilterOptions(routes: TradingRoute[]): {
  systems: string[];
  commodities: string[];
} {
  const systems = new Set<string>();
  const commodities = new Set<string>();

  for (const r of routes) {
    if (r.buy.system) systems.add(r.buy.system);
    if (r.sell.system) systems.add(r.sell.system);
    commodities.add(r.commodity);
  }

  return {
    systems: [...systems].sort(),
    commodities: [...commodities].sort(),
  };
}

export function countActiveRouteFilters(filters: TradingRouteFilters): number {
  let count = 0;
  if (filters.system?.trim()) count++;
  if (filters.buySystem?.trim()) count++;
  if (filters.sellSystem?.trim()) count++;
  if (filters.commodity?.trim()) count++;
  if (filters.legality !== "all") count++;
  if (filters.sameSystem === "yes") count++;
  if (filters.cargoCenter !== "all") count++;
  if (filters.autoloadOnly) count++;
  if (filters.excludeVolatileQt) count++;
  if (filters.minSellStock != null && filters.minSellStock > 0) count++;
  if (filters.minStock != null && filters.minStock > 0) count++;
  if (filters.minContainerSize != null && filters.minContainerSize > 0) count++;
  if (filters.query?.trim()) count++;
  return count;
}

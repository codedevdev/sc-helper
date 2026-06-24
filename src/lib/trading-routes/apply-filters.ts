import type { CommodityTag, RouteFilterParams, ScoredTradeRoute } from "@/lib/trading-routes/types";
import type { TradingRoute } from "@/types/trading-route";

type FilterableRoute = TradingRoute | ScoredTradeRoute;

function isScoredRoute(route: FilterableRoute): route is ScoredTradeRoute {
  return "metrics" in route && route.metrics != null;
}

function grossProfit(route: FilterableRoute): number {
  return isScoredRoute(route) ? route.metrics.grossProfit : route.grossProfit;
}

function buyCost(route: FilterableRoute): number {
  return isScoredRoute(route) ? route.metrics.buyCost : route.totalCost;
}

function scuStock(route: FilterableRoute): number {
  return route.sell.scuStock ?? 0;
}

function matchesCommodityTags(route: FilterableRoute, tags: CommodityTag[]): boolean {
  for (const tag of tags) {
    if (tag === "illegal" && !route.isIllegal) return false;
    if (tag === "legal" && route.isIllegal) return false;
    if (tag === "volatile" && !route.isVolatileQt) return false;
  }
  return true;
}

function passesFilter(route: FilterableRoute, filters: RouteFilterParams): boolean {
  if (route.buy.price >= route.sell.price) return false;

  const profit = grossProfit(route);
  const cost = buyCost(route);

  if (filters.minProfit != null && profit < filters.minProfit) return false;
  if (filters.maxBudget != null && cost > filters.maxBudget) return false;

  if (filters.systems?.length) {
    const allowed = new Set(filters.systems);
    const inSystem =
      allowed.has(route.buy.system) || allowed.has(route.sell.system);
    if (!inSystem) return false;
  }

  if (filters.legalOnly || filters.excludeIllegal) {
    if (route.isIllegal) return false;
  }

  if (filters.sameSystem) {
    if (!route.buy.system || route.buy.system !== route.sell.system) return false;
  }

  if (filters.requireCargoCenter) {
    if (!route.buy.hasCargoCenter || !route.sell.hasCargoCenter) return false;
  }

  if (filters.minStock != null && filters.minStock > 0) {
    if (scuStock(route) < filters.minStock) return false;
  }

  if (filters.commodityTags?.length) {
    if (!matchesCommodityTags(route, filters.commodityTags)) return false;
  }

  return true;
}

export function applyFilters<T extends FilterableRoute>(
  routes: T[],
  filters: RouteFilterParams,
): T[] {
  return routes.filter((r) => passesFilter(r, filters));
}

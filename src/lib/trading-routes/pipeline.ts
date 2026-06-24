import { applyFilters } from "@/lib/trading-routes/apply-filters";
import { buildTradePairs } from "@/lib/trading-routes/build-trade-pairs";
import { candidateToScoredRoute } from "@/lib/trading-routes/calculate-metrics";
import { rankRoutes } from "@/lib/trading-routes/rank-routes";
import type {
  OrbitDistanceMap,
  RouteFilterParams,
  RoutePairBuildFilters,
  RouteSortKey,
  ScoredTradeRoute,
  TradeRouteMarketInput,
  TradeRouteSearchParams,
} from "@/lib/trading-routes/types";

export interface SearchRoutesOptions {
  pairFilters?: RoutePairBuildFilters;
  routeFilters?: RouteFilterParams;
  sortBy?: RouteSortKey;
  orbitDistances?: OrbitDistanceMap;
}

export function searchRoutes(
  market: TradeRouteMarketInput,
  searchParams: TradeRouteSearchParams,
  options: SearchRoutesOptions = {},
): ScoredTradeRoute[] {
  const { candidates } = buildTradePairs(market, options.pairFilters);
  const orbitDistances = options.orbitDistances ?? {};

  const scored: ScoredTradeRoute[] = [];
  for (const candidate of candidates) {
    const route = candidateToScoredRoute(candidate, searchParams, orbitDistances);
    if (route) scored.push(route);
  }

  const filtered = options.routeFilters
    ? applyFilters(scored, options.routeFilters)
    : scored;

  return options.sortBy ? rankRoutes(filtered, options.sortBy) : filtered;
}
export { searchLoops, type SearchLoopsOptions } from "@/lib/trading-routes/search-loops";

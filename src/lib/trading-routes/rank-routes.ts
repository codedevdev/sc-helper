import type { RouteSortKey } from "@/lib/trading-routes/types";
import type { ScoredTradeRoute } from "@/lib/trading-routes/types";
import type { TradingRoute } from "@/types/trading-route";

type RankableRoute = TradingRoute | ScoredTradeRoute;

function isScoredRoute(route: RankableRoute): route is ScoredTradeRoute {
  return "metrics" in route && route.metrics != null;
}

function profit(route: RankableRoute): number {
  return isScoredRoute(route) ? route.metrics.grossProfit : route.grossProfit;
}

function roi(route: RankableRoute): number {
  return isScoredRoute(route) ? route.metrics.roi : route.roiPercent / 100;
}

function buyCost(route: RankableRoute): number {
  return isScoredRoute(route) ? route.metrics.buyCost : route.totalCost;
}

function profitPerMin(route: RankableRoute): number {
  if (isScoredRoute(route)) {
    const mins = route.metrics.estimatedMinutes;
    return mins > 0 ? route.metrics.grossProfit / mins : 0;
  }
  return route.profitPerMin;
}

function compareRoutes(a: RankableRoute, b: RankableRoute, sortBy: RouteSortKey): number {
  switch (sortBy) {
    case "profit":
      return profit(b) - profit(a);
    case "profitPerMin":
      return profitPerMin(b) - profitPerMin(a);
    case "roi":
      return roi(b) - roi(a);
    case "buyPrice":
      return buyCost(a) - buyCost(b);
    default:
      return profit(b) - profit(a);
  }
}

export function rankRoutes<T extends RankableRoute>(
  routes: T[],
  sortBy: RouteSortKey,
): T[] {
  return [...routes].sort((a, b) => compareRoutes(a, b, sortBy));
}

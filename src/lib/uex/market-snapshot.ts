import { buildRoutes } from "@/lib/uex/build-routes";
import type { UexMarketData } from "@/lib/uex/types";
import type { TradingRoutesBuildResult } from "@/types/trading-route";

export function buildTradingRoutesFromMarketData(
  market: UexMarketData,
): TradingRoutesBuildResult & { fetchedAt: string } {
  const { candidates, sellAlternatives } = buildRoutes(
    market.prices,
    market.terminals,
    market.commodities,
  );
  return {
    candidates,
    sellAlternatives,
    fetchedAt: market.fetchedAt,
  };
}

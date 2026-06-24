import { buildTradePairsFromArrays } from "@/lib/trading-routes/build-trade-pairs";
import type { TradingRoutesBuildResult } from "@/types/trading-route";
import type { Commodity, PriceListing, Terminal } from "@/lib/uex/types";

/** @deprecated Prefer buildTradePairs from @/lib/trading-routes */
export function buildRoutes(
  prices: PriceListing[],
  terminals: Terminal[],
  commodities: Commodity[],
): TradingRoutesBuildResult {
  return buildTradePairsFromArrays(prices, terminals, commodities);
}

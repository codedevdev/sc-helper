/**
 * Manual verification fixtures for the route calculator.
 * Import in dev console: import("@/lib/trading-routes/__examples__")
 *
 * Example 1 — Stanton same-system (Agricium-style):
 *   buy 5_000, sell 7_000, 20 SCU cargo → grossProfit 40_000, roi 0.4, ~13 min total
 *
 * Example 2 — Cross-system (no orbit distance):
 *   Uses HEURISTIC_CROSS_SYSTEM_GM (~60 Gm) + sell-side unload from terminal flags
 *
 * Example 3 — Budget-limited:
 *   budget 50_000, buy 10_000 → scuUsed 5 (not 20), grossProfit 15_000
 */

import { calculateRouteMetrics } from "@/lib/trading-routes/calculate-metrics";
import { searchRoutes } from "@/lib/trading-routes/pipeline";
import type { TradeRouteSearchParams } from "@/lib/trading-routes/types";
import type { TradingRouteCandidate } from "@/types/trading-route";

const baseLeg = {
  hasFreightElevator: false,
  hasLoadingDock: false,
  hasDockingPort: true,
  isRefuel: true,
  isNqa: false,
  maxContainerSize: 16,
  priceAvg: 0,
  status: null as number | null,
};

function leg(
  id: number,
  terminal: string,
  system: string,
  systemId: number,
  orbitId: number,
  price: number,
  scu: number,
  hasCargoCenter: boolean,
  scuStock?: number,
) {
  return {
    terminalId: id,
    terminal,
    location: terminal,
    planet: "Crusader",
    system,
    systemId,
    orbitId,
    hasCargoCenter,
    ...baseLeg,
    price,
    priceAvg: price,
    scu,
    scuStock,
  };
}

/** Same-system Stanton route: buy Port Olisar → sell Area18. */
export const exampleSameSystem: TradingRouteCandidate = {
  commodityId: 1,
  commodity: "Agricium",
  commodityCode: "AGRI",
  isIllegal: false,
  isVolatileQt: false,
  buy: leg(101, "Port Olisar", "Stanton", 1, 10, 5_000, 50, true),
  sell: leg(102, "Area18", "Stanton", 1, 11, 7_000, 50, true),
};

/** Cross-system: Stanton buy → Pyro sell (no distance map). */
export const exampleCrossSystem: TradingRouteCandidate = {
  commodityId: 2,
  commodity: "Laranite",
  commodityCode: "LARA",
  isIllegal: false,
  isVolatileQt: true,
  buy: leg(201, "Grim HEX", "Stanton", 1, 20, 8_000, 30, false),
  sell: leg(202, "Ruin Station", "Pyro", 2, 30, 12_000, 30, false),
};

const defaultParams: TradeRouteSearchParams = {
  cargoScu: 20,
  budgetAuec: 500_000,
  crew: 1,
};

const budgetLimitedParams: TradeRouteSearchParams = {
  cargoScu: 20,
  budgetAuec: 50_000,
  crew: 1,
};

export function runTradingRouteExamples(): void {
  const m1 = calculateRouteMetrics(exampleSameSystem, defaultParams);
  // Expected: scuUsed 20, grossProfit 40_000, roi 0.4, estimatedMinutes ~13
  console.log("[example 1 same-system]", m1);

  const m2 = calculateRouteMetrics(exampleCrossSystem, defaultParams);
  // Expected: grossProfit 80_000, estimatedMinutes uses 15 min QT fallback
  console.log("[example 2 cross-system]", m2);

  const m3 = calculateRouteMetrics(exampleSameSystem, budgetLimitedParams);
  // Expected: scuUsed 5, grossProfit 10_000, buyCost 25_000
  console.log("[example 3 budget-limited]", m3);

  const pipeline = searchRoutes(
    { prices: [], terminals: [], commodities: [] },
    defaultParams,
    { sortBy: "profit" },
  );
  console.log("[pipeline empty market]", pipeline.length, "routes");
}

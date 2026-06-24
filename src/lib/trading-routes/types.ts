import type {
  RouteLegOffer,
  RouteTimeEstimate,
  TerminalSnapshot,
  TradingRoute,
  TradingRouteCandidate,
  TradingRoutePlannerInput,
} from "@/types/trading-route";
import type { QuantumSpeedClass } from "@/lib/trading-routes/ships";
import type { Commodity, PriceListing, Terminal, UexMarketData } from "@/lib/uex/types";
import type { OrbitDistanceMap } from "@/lib/uex/types";

export type { OrbitDistanceMap, Commodity, PriceListing, Terminal, UexMarketData };

export type TradeRouteMarketInput = Pick<UexMarketData, "prices" | "terminals" | "commodities">;

/** User search / planner parameters for route scoring. */
export interface TradeRouteSearchParams {
  cargoScu: number;
  budgetAuec: number;
  crew: 1 | 2 | 3 | 4;
  shipScu?: number;
  shipName?: string;
  excludeIllegal?: boolean;
  requireCargoCenter?: boolean;
  /** Optional flat operating cost deducted from gross profit. */
  operatingCostAuec?: number;
}

/** Lightweight filters applied when building buy/sell pairs. */
export interface RoutePairBuildFilters {
  excludeIllegal?: boolean;
  systems?: string[];
  commodityIds?: number[];
  minSellStock?: number;
}

/** Post-scoring filters for ranked route lists. */
export interface RouteFilterParams {
  maxBudget?: number;
  minProfit?: number;
  systems?: string[];
  legalOnly?: boolean;
  excludeIllegal?: boolean;
  sameSystem?: boolean;
  requireCargoCenter?: boolean;
  commodityTags?: CommodityTag[];
  minStock?: number;
}

export type CommodityTag = "illegal" | "legal" | "volatile";

export type RouteSortKey = "profit" | "profitPerMin" | "roi" | "buyPrice";

export interface RouteMetrics {
  buyCost: number;
  sellRevenue: number;
  grossProfit: number;
  netProfit: number;
  roi: number;
  scuUsed: number;
  profitPerScu: number;
  estimatedMinutes: number;
}

export interface ScoredTradeRoute extends TradingRouteCandidate {
  metrics: RouteMetrics;
}

/** Route with full UI fields (compatible with existing TradingRoute). */
export type EnrichedTradeRoute = TradingRoute;

export interface TravelTimeOptions {
  cargoScu: number;
  crew?: number;
  distanceGm?: number;
  orbitDistances?: OrbitDistanceMap;
  ship?: { name?: string; scu?: number; quantumSpeedClass?: QuantumSpeedClass };
}

export type TravelTimeLeg = RouteLegOffer | TerminalSnapshot;

export interface TradePairsBuildResult {
  candidates: TradingRouteCandidate[];
  sellAlternatives: Record<number, import("@/types/trading-route").SellAlternative[]>;
}

/** Maps planner input to search params (backward compatible). */
export function plannerToSearchParams(
  input: TradingRoutePlannerInput,
  shipName?: string,
): TradeRouteSearchParams {
  const cargoScu =
    input.shipScu != null && input.shipScu > 0 ? input.shipScu : input.cargoScu;
  return {
    cargoScu,
    budgetAuec: input.budgetAuec,
    crew: input.crew,
    shipScu: input.shipScu,
    shipName: shipName || undefined,
    excludeIllegal: input.excludeIllegal,
    requireCargoCenter: input.requireCargoCenter,
  };
}

export type { RouteTimeEstimate, TradingRouteCandidate, TradingRoute };

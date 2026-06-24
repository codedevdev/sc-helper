export interface TerminalSnapshot {
  terminalId: number;
  terminal: string;
  location: string;
  planet: string;
  system: string;
  systemId: number;
  orbitId: number;
  hasCargoCenter: boolean;
  hasFreightElevator: boolean;
  hasLoadingDock: boolean;
  hasDockingPort: boolean;
  isRefuel: boolean;
  isNqa: boolean;
  maxContainerSize: number;
}

export interface RouteLegOffer extends TerminalSnapshot {
  price: number;
  priceAvg: number;
  scu: number;
  scuStock?: number;
  status?: number | null;
}

export interface TradingRouteCandidate {
  commodityId: number;
  commodity: string;
  commodityCode: string;
  isIllegal: boolean;
  isVolatileQt: boolean;
  buy: RouteLegOffer;
  sell: RouteLegOffer;
}

export interface RouteTimeEstimate {
  qt: number;
  load: number;
  unload: number;
  overhead: number;
  total: number;
}

export interface TradingRoute extends TradingRouteCandidate {
  profitPerScu: number;
  effectiveScu: number;
  grossProfit: number;
  totalCost: number;
  roiPercent: number;
  profitPerMin: number;
  distanceGm: number;
  time: RouteTimeEstimate;
}

/** One buy→sell hop inside a multi-leg loop. */
export interface LoopLeg {
  commodityId: number;
  commodity: string;
  commodityCode: string;
  isIllegal: boolean;
  isVolatileQt: boolean;
  buy: RouteLegOffer;
  sell: RouteLegOffer;
}

export interface TradingLoopCandidate {
  id: string;
  legs: LoopLeg[];
}

export interface TradingLoopRoute extends TradingLoopCandidate {
  grossProfit: number;
  totalCost: number;
  roiPercent: number;
  profitPerMin: number;
  profitPerScu: number;
  effectiveScu: number;
  distanceGm: number;
  time: RouteTimeEstimate;
  legTimes: RouteTimeEstimate[];
  isIllegal: boolean;
  isVolatileQt: boolean;
}

export interface TradingLoopsBuildResult {
  candidates: TradingLoopCandidate[];
}

export interface TradingLoopsSnapshot {
  candidates: TradingLoopCandidate[];
  fetchedAt: string;
  source: "uex" | "cache";
}

export interface TradingLoopsStats {
  count: number;
  bestProfit: number | null;
  bestRoi: number | null;
  legCount: number | null;
}

export type TradingRouteMode = "single" | "loop" | "en-route" | "lookup";

export interface SellAlternative {
  terminalId: number;
  terminal: string;
  location: string;
  planet: string;
  system: string;
  price: number;
  scu: number;
  scuStock: number;
  hasCargoCenter: boolean;
}

export interface TradingRoutesBuildResult {
  candidates: TradingRouteCandidate[];
  sellAlternatives: Record<number, SellAlternative[]>;
}

export interface TradingRoutesSnapshot {
  candidates: TradingRouteCandidate[];
  sellAlternatives: Record<number, SellAlternative[]>;
  fetchedAt: string;
  source: "uex" | "cache";
}

export type TradingRouteSortKey =
  | "total-profit"
  | "profit-per-scu"
  | "roi"
  | "profit-per-min"
  | "time"
  | "buy-price";

export interface TradingRoutePlannerInput {
  cargoScu: number;
  budgetAuec: number;
  crew: 1 | 2 | 3 | 4;
  shipScu?: number;
  excludeIllegal?: boolean;
  requireCargoCenter?: boolean;
}

export type TradeLegAction = "buy" | "sell";

/** One atomic buy or sell step in a trade loop. */
export interface TradeLeg {
  step: number;
  action: TradeLegAction;
  commodityId: number;
  commodity: string;
  terminal: RouteLegOffer;
  scuUsed: number;
  price: number;
  costOrRevenue: number;
  profitThisLeg: number;
  /** Travel time from the previous terminal; zeroed when step === 1. */
  travelFromPrev: RouteTimeEstimate;
}

/** A scored circular trade route built from atomic buy/sell legs. */
export interface TradeLoop {
  id: string;
  legs: TradeLeg[];
  startTerminalId: number;
  returnsToStart: boolean;
  totalProfit: number;
  /** Total route time in minutes. */
  totalTime: number;
  profitPerMin: number;
  totalScuTurnover: number;
  /** Unique commodity names in visit order. */
  commoditiesUsed: string[];
  /** Unique system names in visit order. */
  systemsVisited: string[];
  finalBudget: number;
  roiPercent: number;
}

export interface LoopPlannerInput extends TradingRoutePlannerInput {
  /** @default 3 */
  minLegs?: number;
  /** @default 5 */
  maxLegs?: number;
  startTerminalId?: number;
  /** @default true */
  returnToStart?: boolean;
  /** @default false */
  sameSystemOnly?: boolean;
  /** @default true */
  allowMixedCommodities?: boolean;
  maxTotalTimeMinutes?: number;
  /** @default "all" */
  systemFilterMode?: "all" | "allow" | "exclude";
  allowedSystemIds?: number[];
  excludedSystemIds?: number[];
}

export type LoopPlannerSortKey =
  | "total-profit"
  | "profit-per-min"
  | "total-time"
  | "leg-count";

export interface LoopPlannerFilters {
  sort: LoopPlannerSortKey;
  query?: string;
  commodity?: string;
  system?: string;
  terminal?: string;
  minProfit?: number;
  maxTime?: number;
}

export interface LoopPlannerStats {
  count: number;
  bestProfit: number | null;
  bestProfitPerMin: number | null;
  avgLegs: number | null;
}

export interface SavedTradeLoop {
  id: string;
  name: string;
  loop: TradeLoop;
  planner?: LoopPlannerInput;
  totalProfit: number;
  profitPerMin: number;
  legCount: number;
  createdAt: string;
}

/** Route calculator search params (see @/lib/trading-routes). */
export type { TradeRouteSearchParams } from "@/lib/trading-routes/types";

export interface TradingRouteFilters {
  system?: string;
  buySystem?: string;
  sellSystem?: string;
  commodity?: string;
  legality: "all" | "legal" | "illegal";
  sameSystem: "all" | "yes";
  cargoCenter: "all" | "both" | "buy" | "sell";
  autoloadOnly?: boolean;
  excludeVolatileQt?: boolean;
  minSellStock?: number;
  minStock?: number;
  minContainerSize?: number;
  query?: string;
  sort: TradingRouteSortKey;
}

export interface EnRoutePlannerInput extends TradingRoutePlannerInput {
  originTerminalId: number;
  destinationTerminalId: number;
  maxStops?: number;
  maxDetourPercent?: number;
}

export interface EnRouteLeg {
  fromTerminalId: number;
  toTerminalId: number;
  commodity: string;
  commodityId: number;
  profit: number;
  travelMinutes: number;
  buyTerminal: string;
  sellTerminal: string;
}

export interface EnRouteResult {
  id: string;
  originTerminalId: number;
  destinationTerminalId: number;
  originName: string;
  destinationName: string;
  legs: EnRouteLeg[];
  directMinutes: number;
  totalMinutes: number;
  totalProfit: number;
  profitPerMin: number;
  detourPercent: number;
}

export type EnRouteSortKey = "total-profit" | "profit-per-min" | "total-time";

export interface EnRouteFilters {
  sort: EnRouteSortKey;
  query?: string;
  minProfit?: number;
}

export interface TradingRoutesStats {
  count: number;
  bestProfit: number | null;
  bestRoi: number | null;
  commodityCount: number;
}

export const MAX_DISPLAYED_ROUTES = 80;

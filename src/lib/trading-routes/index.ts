export {
  QT_SPEED_GM_PER_SEC,
  QT_FALLBACK_SAME_ORBIT_MIN,
  QT_FALLBACK_SAME_SYSTEM_MIN,
  QT_FALLBACK_CROSS_SYSTEM_MIN,
  HEURISTIC_SAME_SYSTEM_GM,
  HEURISTIC_CROSS_SYSTEM_GM,
  SYSTEM_PAIR_GM,
  TOP_OFFERS_PER_LEG,
  MIN_LOOP_LEGS,
  MAX_LOOP_LEGS,
  MAX_LOOP_CANDIDATES,
  DEFAULT_MAX_LOOP_RESULTS,
  MAX_LOOP_EXPLORED_NODES,
  HEAVY_LOOP_EDGE_THRESHOLD,
  TOP_LOOP_START_TERMINALS,
  UNLOAD_MINUTES,
  ROUTE_OVERHEAD_MINUTES,
  DEFAULT_MAX_CONTAINER_SIZE,
} from "@/lib/trading-routes/constants";

export {
  TRADING_SHIPS,
  getShipByName,
  getQuantumSpeedGmPerSec,
  getQuantumSpeedClassLabel,
  resolveShipForTravelTime,
  fetchCargoShipsFromUex,
  getTradingShipsList,
  type TradingShip,
  type QuantumSpeedClass,
} from "@/lib/trading-routes/ships";

export type {
  CommodityTag,
  EnrichedTradeRoute,
  OrbitDistanceMap,
  RouteFilterParams,
  RouteMetrics,
  RoutePairBuildFilters,
  RouteSortKey,
  ScoredTradeRoute,
  TradePairsBuildResult,
  TradeRouteMarketInput,
  TradeRouteSearchParams,
  TravelTimeLeg,
  TravelTimeOptions,
} from "@/lib/trading-routes/types";

export { plannerToSearchParams } from "@/lib/trading-routes/types";

export { buildTradePairs, buildTradePairsFromArrays } from "@/lib/trading-routes/build-trade-pairs";

export {
  buildLoopRoutes,
  buildLoopRoutesFromArrays,
  loopCommoditySummary,
  loopTerminalPath,
  type LoopBuildResult,
} from "@/lib/trading-routes/build-loop-routes";

export {
  buildTransitionGraph,
  type TransitionEdge,
  type TransitionGraph,
} from "@/lib/trading-routes/build-transition-graph";

export {
  createInitialState,
  canExecuteLeg,
  applyLeg,
  estimateRepositionTime,
  type LoopState,
} from "@/lib/trading-routes/loop-state-machine";

export {
  calculateRouteMetrics,
  candidateToScoredRoute,
  candidateToTradingRoute,
  applySearchParamsToCandidates,
  computeScuUsed,
  computeEffectiveScu,
} from "@/lib/trading-routes/calculate-metrics";

export {
  calculateLoopRouteMetrics,
  candidateToTradingLoopRoute,
  applySearchParamsToLoopCandidates,
  type LoopRouteMetrics,
} from "@/lib/trading-routes/calculate-loop-metrics";

export {
  estimateTravelTime,
  lookupOrbitDistanceGm,
  orbitDistanceKey,
  resolveDistanceGm,
} from "@/lib/trading-routes/estimate-travel-time";

export {
  FILTER_PRESETS,
  FILTER_PRESET_IDS,
  applyFilterPreset,
  detectMatchingPresetId,
  type FilterPresetId,
} from "@/lib/trading-routes/filter-presets";

export { applyFilters } from "@/lib/trading-routes/apply-filters";
export { rankRoutes } from "@/lib/trading-routes/rank-routes";
export { searchRoutes } from "@/lib/trading-routes/pipeline";
export type { SearchRoutesOptions } from "@/lib/trading-routes/pipeline";
export { searchLoops, type SearchLoopsOptions } from "@/lib/trading-routes/search-loops";
export { searchLoopsFromMarket } from "@/lib/trading-routes/loop-worker-client";

export {
  buildRouteNote,
  buildRouteTitle,
  buildRouteLocation,
  getRouteLogAmount,
  buildRouteTransactionDefaults,
  buildRouteSessionDefaults,
  type LogProfitBasis,
  type RouteIntegrationOptions,
  type RouteTransactionFormDefaults,
  type RouteSessionFormDefaults,
} from "@/lib/trading-routes/route-integration";

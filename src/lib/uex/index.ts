export { apiFetch, UexApiError, DEFAULT_TIMEOUT_MS, getBaseUrl } from "@/lib/uex/client";
export {
  getResolvedUexConfig,
  hasSavedUexToken,
  initUexConfigFromSettings,
  loadAndInitUexConfig,
} from "@/lib/uex/config";
export type { ResolvedUexConfig, UexConfigSource } from "@/lib/uex/config";
export type { UexErrorCode } from "@/lib/uex/client";
export { buildRoutes } from "@/lib/uex/build-routes";
export {
  applyPlannerToCandidates,
  candidateToTradingRoute,
  computeEffectiveScu,
} from "@/lib/uex/calculate-metrics";
export {
  clearUexCache,
  fetchMarketData,
  getCachedMarketData,
  getCachedOrbitDistances,
  getMarketData,
  getSnapshotFallbackMessage,
  getUexMarketTtlMs,
  initUexCacheFromSettings,
  isMarketDataStale,
  isUsingSnapshotFallback,
  mergeOrbitDistances,
  persistBrowserUexTtlMinutes,
  setCachedOrbitDistances,
  setUexMarketTtlMs,
  subscribeMarketData,
  UEX_MARKET_TTL_MS,
} from "@/lib/uex/cache";
export {
  fetchCommodities,
  fetchCommoditiesPricesAll,
  fetchMarketDataBundle,
  fetchOrbitDistancesForSystems,
  fetchTerminals,
} from "@/lib/uex/endpoints";
export {
  estimateTime,
  lookupOrbitDistanceGm,
  orbitDistanceKey,
} from "@/lib/uex/estimate-time";
export { buildTradingRoutesFromMarketData } from "@/lib/uex/market-snapshot";
export {
  collectSystemIdsFromCandidates,
  fetchOrbitDistances,
} from "@/lib/uex/orbit-distances";
export { TRADING_SHIPS } from "@/lib/uex/ships";
export {
  buildTradePairs,
  calculateRouteMetrics,
  estimateTravelTime,
  applyFilters as applyRouteFilters,
  rankRoutes,
  searchRoutes,
  plannerToSearchParams,
} from "@/lib/trading-routes";
export type {
  RouteMetrics,
  RouteFilterParams,
  RouteSortKey,
  TradeRouteSearchParams,
  ScoredTradeRoute,
} from "@/lib/trading-routes";
export type {
  Commodity,
  OrbitDistanceMap,
  PriceListing,
  Ship,
  Terminal,
  UexApiResponse,
  UexCommodity,
  UexCommodityPrice,
  UexConnectionStatus,
  UexMarketData,
  UexOrbitDistance,
  UexTerminal,
} from "@/lib/uex/types";

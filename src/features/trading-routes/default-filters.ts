import type { LogProfitBasis } from "@/lib/trading-routes/route-integration";
import type { FilterPresetId } from "@/lib/trading-routes/filter-presets";
import type { TradingRoutesDefaults } from "@/types/settings";
import type { TradingRouteFilters, TradingRoutePlannerInput } from "@/types/trading-route";

export const DEFAULT_LOG_PROFIT_BASIS: LogProfitBasis = "gross";

export const TRADING_ROUTES_FILTERS_STORAGE_KEY = "sc-trader.trading-routes.filters";

const LEGACY_TRADING_ROUTES_FILTERS_STORAGE_KEY = "sc-trader-trading-routes-filters";

export const DEFAULT_PLANNER_INPUT: TradingRoutePlannerInput = {
  cargoScu: 46,
  budgetAuec: 100_000,
  crew: 1,
};

export const DEFAULT_TRADING_ROUTE_FILTERS: TradingRouteFilters = {
  system: "",
  commodity: "",
  legality: "all",
  sameSystem: "all",
  cargoCenter: "all",
  sort: "total-profit",
};

export interface PersistedTradingRoutesState {
  planner?: Partial<TradingRoutePlannerInput>;
  filters?: Partial<TradingRouteFilters>;
  shipName?: string;
  presetId?: FilterPresetId | null;
  logProfitBasis?: LogProfitBasis;
}

export function mergeLogProfitBasis(value?: LogProfitBasis): LogProfitBasis {
  return value === "net" ? "net" : DEFAULT_LOG_PROFIT_BASIS;
}

function settingsDefaultsToPersisted(
  settingsDefaults?: TradingRoutesDefaults,
): PersistedTradingRoutesState {
  if (!settingsDefaults) return {};
  const partial: PersistedTradingRoutesState = {};
  if (settingsDefaults.shipName) partial.shipName = settingsDefaults.shipName;
  if (settingsDefaults.cargoScu != null || settingsDefaults.budgetAuec != null || settingsDefaults.crew != null) {
    partial.planner = {
      cargoScu: settingsDefaults.cargoScu,
      budgetAuec: settingsDefaults.budgetAuec,
      crew: settingsDefaults.crew,
    };
  }
  if (settingsDefaults.logProfitBasis) partial.logProfitBasis = settingsDefaults.logProfitBasis;
  if (settingsDefaults.sort) partial.filters = { sort: settingsDefaults.sort };
  return partial;
}

function readStoredTradingRoutesState(): PersistedTradingRoutesState {
  try {
    let raw = localStorage.getItem(TRADING_ROUTES_FILTERS_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_TRADING_ROUTES_FILTERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedTradingRoutesState;
        savePersistedTradingRoutesState(parsed);
        localStorage.removeItem(LEGACY_TRADING_ROUTES_FILTERS_STORAGE_KEY);
        return parsed;
      }
      return {};
    }
    return JSON.parse(raw) as PersistedTradingRoutesState;
  } catch {
    return {};
  }
}

/** Settings baseline, then localStorage session overrides on top. */
export function loadPersistedTradingRoutesState(
  settingsDefaults?: TradingRoutesDefaults,
): PersistedTradingRoutesState {
  const baseline = settingsDefaultsToPersisted(settingsDefaults);
  const stored = readStoredTradingRoutesState();
  return {
    planner: { ...baseline.planner, ...stored.planner },
    filters: { ...baseline.filters, ...stored.filters },
    shipName: stored.shipName ?? baseline.shipName,
    presetId: stored.presetId ?? baseline.presetId,
    logProfitBasis: stored.logProfitBasis ?? baseline.logProfitBasis,
  };
}

export function savePersistedTradingRoutesState(state: PersistedTradingRoutesState): void {
  try {
    localStorage.setItem(TRADING_ROUTES_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePersistedTradingRoutesState(
  state: PersistedTradingRoutesState,
  delayMs = 300,
): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    savePersistedTradingRoutesState(state);
  }, delayMs);
}

export function mergePlannerInput(
  partial?: Partial<TradingRoutePlannerInput>,
): TradingRoutePlannerInput {
  return {
    ...DEFAULT_PLANNER_INPUT,
    ...partial,
    crew: (partial?.crew ?? DEFAULT_PLANNER_INPUT.crew) as TradingRoutePlannerInput["crew"],
  };
}

export function mergeTradingRouteFilters(
  partial?: Partial<TradingRouteFilters>,
): TradingRouteFilters {
  return {
    ...DEFAULT_TRADING_ROUTE_FILTERS,
    ...partial,
  };
}

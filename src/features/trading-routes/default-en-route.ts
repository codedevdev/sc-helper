import { DEFAULT_PLANNER_INPUT } from "@/features/trading-routes/default-filters";
import type { TradingRoutesDefaults } from "@/types/settings";
import type { EnRouteFilters, EnRoutePlannerInput } from "@/types/trading-route";

export const EN_ROUTE_STORAGE_KEY = "sc-trader.en-route";

export const DEFAULT_EN_ROUTE_PLANNER: EnRoutePlannerInput = {
  ...DEFAULT_PLANNER_INPUT,
  originTerminalId: 0,
  destinationTerminalId: 0,
  maxStops: 3,
  maxDetourPercent: 25,
};

export const DEFAULT_EN_ROUTE_FILTERS: EnRouteFilters = {
  sort: "total-profit",
};

export interface PersistedEnRouteState {
  planner?: Partial<EnRoutePlannerInput>;
  filters?: Partial<EnRouteFilters>;
  shipName?: string;
}

function settingsDefaultsToPersisted(
  settingsDefaults?: TradingRoutesDefaults,
): PersistedEnRouteState {
  if (!settingsDefaults) return {};
  const partial: PersistedEnRouteState = {};
  if (settingsDefaults.shipName) partial.shipName = settingsDefaults.shipName;
  if (
    settingsDefaults.cargoScu != null ||
    settingsDefaults.budgetAuec != null ||
    settingsDefaults.crew != null
  ) {
    partial.planner = {
      cargoScu: settingsDefaults.cargoScu,
      budgetAuec: settingsDefaults.budgetAuec,
      crew: settingsDefaults.crew,
    };
  }
  return partial;
}

function readStoredEnRouteState(): PersistedEnRouteState {
  try {
    const raw = localStorage.getItem(EN_ROUTE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedEnRouteState;
  } catch {
    return {};
  }
}

export function loadPersistedEnRouteState(
  settingsDefaults?: TradingRoutesDefaults,
): PersistedEnRouteState {
  const baseline = settingsDefaultsToPersisted(settingsDefaults);
  const stored = readStoredEnRouteState();
  return {
    planner: { ...baseline.planner, ...stored.planner },
    filters: { ...stored.filters },
    shipName: stored.shipName ?? baseline.shipName,
  };
}

export function savePersistedEnRouteState(state: PersistedEnRouteState): void {
  try {
    localStorage.setItem(EN_ROUTE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePersistedEnRouteState(state: PersistedEnRouteState, delayMs = 300): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    savePersistedEnRouteState(state);
  }, delayMs);
}

export function mergeEnRoutePlanner(partial?: Partial<EnRoutePlannerInput>): EnRoutePlannerInput {
  return {
    ...DEFAULT_EN_ROUTE_PLANNER,
    ...partial,
    crew: (partial?.crew ?? DEFAULT_EN_ROUTE_PLANNER.crew) as EnRoutePlannerInput["crew"],
  };
}

export function mergeEnRouteFilters(partial?: Partial<EnRouteFilters>): EnRouteFilters {
  return {
    ...DEFAULT_EN_ROUTE_FILTERS,
    ...partial,
  };
}

import { DEFAULT_PLANNER_INPUT } from "@/features/trading-routes/default-filters";
import type { TradingRoutesDefaults } from "@/types/settings";
import type { LoopPlannerFilters, LoopPlannerInput } from "@/types/trading-route";

export const LOOP_PLANNER_STORAGE_KEY = "sc-trader.loop-planner";

export const DEFAULT_LOOP_PLANNER_INPUT: LoopPlannerInput = {
  ...DEFAULT_PLANNER_INPUT,
  minLegs: 3,
  maxLegs: 5,
  returnToStart: true,
  allowMixedCommodities: true,
  sameSystemOnly: false,
  systemFilterMode: "all",
  allowedSystemIds: [],
  excludedSystemIds: [],
};

export const DEFAULT_LOOP_PLANNER_FILTERS: LoopPlannerFilters = {
  sort: "profit-per-min",
};

export interface PersistedLoopPlannerState {
  planner?: Partial<LoopPlannerInput>;
  filters?: Partial<LoopPlannerFilters>;
  shipName?: string;
}

function settingsDefaultsToPersisted(
  settingsDefaults?: TradingRoutesDefaults,
): PersistedLoopPlannerState {
  if (!settingsDefaults) return {};
  const partial: PersistedLoopPlannerState = {};
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

function readStoredLoopPlannerState(): PersistedLoopPlannerState {
  try {
    const raw = localStorage.getItem(LOOP_PLANNER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedLoopPlannerState;
  } catch {
    return {};
  }
}

export function loadPersistedLoopPlannerState(
  settingsDefaults?: TradingRoutesDefaults,
): PersistedLoopPlannerState {
  const baseline = settingsDefaultsToPersisted(settingsDefaults);
  const stored = readStoredLoopPlannerState();
  return {
    planner: { ...baseline.planner, ...stored.planner },
    filters: { ...stored.filters },
    shipName: stored.shipName ?? baseline.shipName,
  };
}

export function savePersistedLoopPlannerState(state: PersistedLoopPlannerState): void {
  try {
    localStorage.setItem(LOOP_PLANNER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePersistedLoopPlannerState(
  state: PersistedLoopPlannerState,
  delayMs = 300,
): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    savePersistedLoopPlannerState(state);
  }, delayMs);
}

export function mergeLoopPlannerInput(partial?: Partial<LoopPlannerInput>): LoopPlannerInput {
  return {
    ...DEFAULT_LOOP_PLANNER_INPUT,
    ...partial,
    crew: (partial?.crew ?? DEFAULT_LOOP_PLANNER_INPUT.crew) as LoopPlannerInput["crew"],
    systemFilterMode: partial?.systemFilterMode ?? DEFAULT_LOOP_PLANNER_INPUT.systemFilterMode,
    allowedSystemIds: partial?.allowedSystemIds ?? DEFAULT_LOOP_PLANNER_INPUT.allowedSystemIds,
    excludedSystemIds: partial?.excludedSystemIds ?? DEFAULT_LOOP_PLANNER_INPUT.excludedSystemIds,
  };
}

export function mergeLoopPlannerFilters(
  partial?: Partial<LoopPlannerFilters>,
): LoopPlannerFilters {
  return {
    ...DEFAULT_LOOP_PLANNER_FILTERS,
    ...partial,
  };
}

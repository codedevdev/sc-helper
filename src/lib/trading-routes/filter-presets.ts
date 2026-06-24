import type { TradingRouteFilters, TradingRoutePlannerInput } from "@/types/trading-route";

export type FilterPresetId = "starter" | "c2-hauler" | "same-system" | "pilot";

export interface FilterPresetDefinition {
  label: string;
  shipName?: string;
  planner?: Partial<TradingRoutePlannerInput>;
  filters?: Partial<TradingRouteFilters>;
}

export const FILTER_PRESET_IDS: FilterPresetId[] = [
  "starter",
  "pilot",
  "c2-hauler",
  "same-system",
];

export const FILTER_PRESETS: Record<FilterPresetId, FilterPresetDefinition> = {
  starter: {
    label: "Starter",
    shipName: "Nomad",
    planner: { cargoScu: 24, budgetAuec: 50_000, crew: 1, shipScu: 24 },
    filters: { legality: "legal" },
  },
  pilot: {
    label: "Pilot",
    shipName: "Nomad",
    planner: { cargoScu: 24, budgetAuec: 50_000, crew: 1, shipScu: 24 },
    filters: { legality: "legal", sameSystem: "yes", sort: "profit-per-min" },
  },
  "c2-hauler": {
    label: "C2 Hauler",
    shipName: "C2 Hercules",
    planner: { cargoScu: 696, budgetAuec: 500_000, crew: 1, shipScu: 696 },
    filters: { cargoCenter: "both", sort: "profit-per-min" },
  },
  "same-system": {
    label: "Same system only",
    filters: { sameSystem: "yes", sort: "profit-per-min" },
  },
};

export interface AppliedFilterPreset {
  shipName: string;
  planner: TradingRoutePlannerInput;
  filters: TradingRouteFilters;
}

export function applyFilterPreset(
  id: FilterPresetId,
  current: {
    planner: TradingRoutePlannerInput;
    filters: TradingRouteFilters;
    shipName: string;
  },
  mergePlanner: (partial?: Partial<TradingRoutePlannerInput>) => TradingRoutePlannerInput,
  mergeFilters: (partial?: Partial<TradingRouteFilters>) => TradingRouteFilters,
): AppliedFilterPreset {
  const preset = FILTER_PRESETS[id];
  const shipName = preset.shipName ?? current.shipName;
  const planner = mergePlanner({ ...current.planner, ...preset.planner });
  const filters = mergeFilters({ ...current.filters, ...preset.filters });
  return { shipName, planner, filters };
}

function presetMatches(
  id: FilterPresetId,
  planner: TradingRoutePlannerInput,
  filters: TradingRouteFilters,
  shipName: string,
): boolean {
  const preset = FILTER_PRESETS[id];
  if (preset.shipName != null && preset.shipName !== shipName) return false;
  const p = preset.planner;
  if (p?.cargoScu != null && planner.cargoScu !== p.cargoScu) return false;
  if (p?.budgetAuec != null && planner.budgetAuec !== p.budgetAuec) return false;
  if (p?.crew != null && planner.crew !== p.crew) return false;
  if (p?.shipScu != null && planner.shipScu !== p.shipScu) return false;
  const f = preset.filters;
  if (f?.legality != null && filters.legality !== f.legality) return false;
  if (f?.sameSystem != null && filters.sameSystem !== f.sameSystem) return false;
  if (f?.cargoCenter != null && filters.cargoCenter !== f.cargoCenter) return false;
  if (f?.sort != null && filters.sort !== f.sort) return false;
  if (id === "pilot") {
    return (
      filters.legality === "legal" &&
      filters.sameSystem === "yes" &&
      filters.sort === "profit-per-min"
    );
  }
  return true;
}

export function detectMatchingPresetId(
  planner: TradingRoutePlannerInput,
  filters: TradingRouteFilters,
  shipName: string,
): FilterPresetId | null {
  for (const id of FILTER_PRESET_IDS) {
    if (presetMatches(id, planner, filters, shipName)) return id;
  }
  return null;
}

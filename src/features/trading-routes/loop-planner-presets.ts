import type { LoopPlannerInput } from "@/types/trading-route";

export type LoopPlannerPresetId = "starter" | "stanton-only" | "same-system" | "quick-search";

export interface LoopPlannerPresetDefinition {
  label: string;
  shipName?: string;
  planner: Partial<LoopPlannerInput>;
}

export const LOOP_PLANNER_PRESET_IDS: LoopPlannerPresetId[] = [
  "starter",
  "stanton-only",
  "same-system",
  "quick-search",
];

export const LOOP_PLANNER_PRESETS: Record<LoopPlannerPresetId, LoopPlannerPresetDefinition> = {
  starter: {
    label: "Starter",
    shipName: "Nomad",
    planner: {
      cargoScu: 24,
      budgetAuec: 50_000,
      crew: 1,
      shipScu: 24,
      excludeIllegal: true,
      sameSystemOnly: true,
      minLegs: 3,
      maxLegs: 5,
      systemFilterMode: "all",
      allowedSystemIds: [],
      excludedSystemIds: [],
    },
  },
  "stanton-only": {
    label: "Stanton only",
    planner: {
      systemFilterMode: "allow",
      allowedSystemIds: [],
      excludedSystemIds: [],
    },
  },
  "same-system": {
    label: "Same system",
    planner: {
      sameSystemOnly: true,
      maxLegs: 4,
    },
  },
  "quick-search": {
    label: "Quick search",
    planner: {
      maxLegs: 3,
      sameSystemOnly: true,
    },
  },
};

export interface ApplyLoopPlannerPresetOptions {
  stantonSystemId?: number;
}

export function applyLoopPlannerPreset(
  id: LoopPlannerPresetId,
  current: { planner: LoopPlannerInput; shipName: string },
  mergePlanner: (partial?: Partial<LoopPlannerInput>) => LoopPlannerInput,
  options: ApplyLoopPlannerPresetOptions = {},
): { shipName: string; planner: LoopPlannerInput } {
  const preset = LOOP_PLANNER_PRESETS[id];
  const shipName = preset.shipName ?? current.shipName;

  let plannerPatch = { ...preset.planner };
  if (id === "stanton-only" && options.stantonSystemId != null) {
    plannerPatch = {
      ...plannerPatch,
      systemFilterMode: "allow",
      allowedSystemIds: [options.stantonSystemId],
      excludedSystemIds: [],
    };
  }

  const planner = mergePlanner({ ...current.planner, ...plannerPatch });
  return { shipName, planner };
}

function presetMatches(
  id: LoopPlannerPresetId,
  planner: LoopPlannerInput,
  shipName: string,
  stantonSystemId?: number,
): boolean {
  const preset = LOOP_PLANNER_PRESETS[id];
  if (preset.shipName != null && preset.shipName !== shipName) return false;

  const p = preset.planner;
  if (p.cargoScu != null && planner.cargoScu !== p.cargoScu) return false;
  if (p.budgetAuec != null && planner.budgetAuec !== p.budgetAuec) return false;
  if (p.crew != null && planner.crew !== p.crew) return false;
  if (p.shipScu != null && planner.shipScu !== p.shipScu) return false;
  if (p.excludeIllegal != null && planner.excludeIllegal !== p.excludeIllegal) return false;
  if (p.sameSystemOnly != null && planner.sameSystemOnly !== p.sameSystemOnly) return false;
  if (p.minLegs != null && planner.minLegs !== p.minLegs) return false;
  if (p.maxLegs != null && planner.maxLegs !== p.maxLegs) return false;

  if (id === "stanton-only") {
    if (planner.systemFilterMode !== "allow") return false;
    if (stantonSystemId == null) return false;
    const allowed = planner.allowedSystemIds ?? [];
    return allowed.length === 1 && allowed[0] === stantonSystemId;
  }

  if (p.systemFilterMode != null && planner.systemFilterMode !== p.systemFilterMode) return false;

  return true;
}

export function detectMatchingLoopPlannerPresetId(
  planner: LoopPlannerInput,
  shipName: string,
  stantonSystemId?: number,
): LoopPlannerPresetId | null {
  for (const id of LOOP_PLANNER_PRESET_IDS) {
    if (presetMatches(id, planner, shipName, stantonSystemId)) return id;
  }
  return null;
}

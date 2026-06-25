import { mergeLoopPlannerInput } from "@/features/trading-routes/default-loop-planner";
import type { LoopPlannerInput } from "@/types/trading-route";

export type LoopPlannerPresetId = "starter" | "quick-search";

export type LoopPlannerProfileValue = LoopPlannerPresetId | "custom";

export interface LoopPlannerPresetDefinition {
  label: string;
  description: string;
  shipName?: string;
  planner: Partial<LoopPlannerInput>;
}

export const LOOP_PLANNER_PRESET_IDS: LoopPlannerPresetId[] = ["starter", "quick-search"];

export const LOOP_PLANNER_PRESETS: Record<LoopPlannerPresetId, LoopPlannerPresetDefinition> = {
  starter: {
    label: "Starter",
    description: "Nomad 24 SCU, same system, legal only, 3–5 legs",
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
  "quick-search": {
    label: "Fast scan",
    description: "Max 3 legs, same system — faster search",
    planner: {
      minLegs: 3,
      maxLegs: 3,
      sameSystemOnly: true,
      systemFilterMode: "all",
      allowedSystemIds: [],
      excludedSystemIds: [],
    },
  },
};

export function isStantonOnly(planner: LoopPlannerInput, stantonSystemId?: number): boolean {
  if (stantonSystemId == null) return false;
  const allowed = planner.allowedSystemIds ?? [];
  return (
    planner.systemFilterMode === "allow" &&
    allowed.length === 1 &&
    allowed[0] === stantonSystemId
  );
}

export function stantonOnlyPatch(
  enabled: boolean,
  stantonSystemId?: number,
): Partial<LoopPlannerInput> {
  if (enabled && stantonSystemId != null) {
    return {
      systemFilterMode: "allow",
      allowedSystemIds: [stantonSystemId],
      excludedSystemIds: [],
    };
  }
  return {
    systemFilterMode: "all",
    allowedSystemIds: [],
    excludedSystemIds: [],
  };
}

export function applyLoopPlannerPreset(
  id: LoopPlannerPresetId,
  current: { planner: LoopPlannerInput; shipName: string },
  mergePlanner: (partial?: Partial<LoopPlannerInput>) => LoopPlannerInput = mergeLoopPlannerInput,
): { shipName: string; planner: LoopPlannerInput } {
  const preset = LOOP_PLANNER_PRESETS[id];
  const shipName = preset.shipName ?? current.shipName;
  const planner = mergePlanner(preset.planner);
  return { shipName, planner };
}

export function applyQuickSearchPatch(planner: LoopPlannerInput): Partial<LoopPlannerInput> {
  const minLegs = Math.min(planner.minLegs ?? 3, 3);
  return {
    minLegs,
    maxLegs: 3,
    sameSystemOnly: true,
    systemFilterMode: "all",
    allowedSystemIds: [],
    excludedSystemIds: [],
  };
}

function presetMatches(
  id: LoopPlannerPresetId,
  planner: LoopPlannerInput,
  shipName: string,
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
  if (p.systemFilterMode != null && planner.systemFilterMode !== p.systemFilterMode) return false;

  const allowed = planner.allowedSystemIds ?? [];
  const excluded = planner.excludedSystemIds ?? [];
  if ((p.allowedSystemIds ?? []).length !== allowed.length) return false;
  if ((p.excludedSystemIds ?? []).length !== excluded.length) return false;
  for (let i = 0; i < allowed.length; i++) {
    if (allowed[i] !== (p.allowedSystemIds ?? [])[i]) return false;
  }

  return true;
}

export function detectMatchingLoopPlannerPresetId(
  planner: LoopPlannerInput,
  shipName: string,
): LoopPlannerPresetId | null {
  for (const id of LOOP_PLANNER_PRESET_IDS) {
    if (presetMatches(id, planner, shipName)) return id;
  }
  return null;
}

export function resolveLoopProfileValue(
  planner: LoopPlannerInput,
  shipName: string,
): LoopPlannerProfileValue {
  return detectMatchingLoopPlannerPresetId(planner, shipName) ?? "custom";
}

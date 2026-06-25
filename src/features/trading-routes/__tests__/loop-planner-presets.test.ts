import { describe, expect, it } from "vitest";
import { mergeLoopPlannerInput } from "@/features/trading-routes/default-loop-planner";
import {
  applyLoopPlannerPreset,
  applyQuickSearchPatch,
  detectMatchingLoopPlannerPresetId,
  isStantonOnly,
  stantonOnlyPatch,
} from "@/features/trading-routes/loop-planner-presets";
import type { LoopPlannerInput } from "@/types/trading-route";

const STANTON_ID = 42;

const BASE_PLANNER: LoopPlannerInput = mergeLoopPlannerInput({
  cargoScu: 46,
  budgetAuec: 100_000,
  shipScu: 46,
});

describe("loop-planner-presets", () => {
  it("applyLoopPlannerPreset replaces from defaults, not current planner", () => {
    const current = mergeLoopPlannerInput({
      cargoScu: 696,
      budgetAuec: 500_000,
      shipScu: 696,
      startTerminalId: 99,
    });

    const applied = applyLoopPlannerPreset("starter", { planner: current, shipName: "" });

    expect(applied.shipName).toBe("Nomad");
    expect(applied.planner.cargoScu).toBe(24);
    expect(applied.planner.budgetAuec).toBe(50_000);
    expect(applied.planner.sameSystemOnly).toBe(true);
    expect(applied.planner.excludeIllegal).toBe(true);
    expect(applied.planner.startTerminalId).toBeUndefined();
  });

  it("detects starter and quick-search profiles", () => {
    const starter = applyLoopPlannerPreset("starter", {
      planner: BASE_PLANNER,
      shipName: "Cutlass Black",
    });
    expect(
      detectMatchingLoopPlannerPresetId(starter.planner, starter.shipName),
    ).toBe("starter");

    const quick = applyLoopPlannerPreset("quick-search", {
      planner: BASE_PLANNER,
      shipName: "",
    });
    expect(detectMatchingLoopPlannerPresetId(quick.planner, quick.shipName)).toBe("quick-search");
  });

  it("returns null when settings diverge from presets", () => {
    expect(detectMatchingLoopPlannerPresetId(BASE_PLANNER, "")).toBeNull();
  });

  it("stantonOnlyPatch toggles allow list", () => {
    expect(isStantonOnly(stantonOnlyPatch(true, STANTON_ID) as LoopPlannerInput, STANTON_ID)).toBe(
      true,
    );
    expect(
      isStantonOnly(
        mergeLoopPlannerInput(stantonOnlyPatch(false, STANTON_ID)),
        STANTON_ID,
      ),
    ).toBe(false);
  });

  it("applyQuickSearchPatch caps legs and enables same system", () => {
    const patch = applyQuickSearchPatch(
      mergeLoopPlannerInput({ minLegs: 4, maxLegs: 6, sameSystemOnly: false }),
    );
    expect(patch.maxLegs).toBe(3);
    expect(patch.minLegs).toBe(3);
    expect(patch.sameSystemOnly).toBe(true);
    expect(patch.systemFilterMode).toBe("all");
  });
});

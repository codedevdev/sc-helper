import { describe, expect, it } from "vitest";
import { mergeLoopPlannerInput } from "@/features/trading-routes/default-loop-planner";
import { buildLoopPlannerSummary } from "@/features/trading-routes/loop-planner-summary";

describe("buildLoopPlannerSummary", () => {
  it("returns undefined when advanced settings are default", () => {
    const planner = mergeLoopPlannerInput({});
    expect(buildLoopPlannerSummary(planner)).toBeUndefined();
  });

  it("summarizes non-default advanced options", () => {
    const planner = mergeLoopPlannerInput({
      budgetAuec: 250_000,
      crew: 2,
      startTerminalId: 10,
      maxTotalTimeMinutes: 90,
      requireCargoCenter: true,
    });

    const summary = buildLoopPlannerSummary(planner);
    expect(summary).toContain("250k budget");
    expect(summary).toContain("2 crew");
    expect(summary).toContain("Start terminal");
    expect(summary).toContain("≤90m search");
    expect(summary).toContain("Cargo center");
  });

  it("omits stanton-only from summary when essentials toggle handles it", () => {
    const planner = mergeLoopPlannerInput({
      systemFilterMode: "allow",
      allowedSystemIds: [42],
      excludedSystemIds: [],
    });
    const summary = buildLoopPlannerSummary(planner, {
      stantonSystemId: 42,
      systemNames: new Map([[42, "Stanton"]]),
    });
    expect(summary).toBeUndefined();
  });
});

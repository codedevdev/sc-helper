import { describe, expect, it } from "vitest";
import { filterSortLoops } from "@/features/trading-routes/filter-loop-planner";
import type { LoopPlannerFilters, TradeLoop } from "@/types/trading-route";

const baseFilters: LoopPlannerFilters = { sort: "total-profit" };

function makeLoop(overrides: Partial<TradeLoop>): TradeLoop {
  return {
    id: "loop-1",
    legs: [],
    startTerminalId: 1,
    returnsToStart: true,
    totalProfit: 10000,
    totalTime: 60,
    profitPerMin: 166,
    totalScuTurnover: 72,
    commoditiesUsed: ["Agricium"],
    systemsVisited: ["Stanton"],
    finalBudget: 50000,
    roiPercent: 25,
    ...overrides,
  };
}

describe("filterSortLoops", () => {
  const loops = [
    makeLoop({ id: "a", totalProfit: 20000, commoditiesUsed: ["Agricium"] }),
    makeLoop({
      id: "b",
      totalProfit: 5000,
      commoditiesUsed: ["Laranite"],
      systemsVisited: ["Pyro"],
      totalTime: 120,
    }),
  ];

  it("filters by commodity", () => {
    const result = filterSortLoops(loops, { ...baseFilters, commodity: "Laranite" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("filters by min profit", () => {
    const result = filterSortLoops(loops, { ...baseFilters, minProfit: 10000 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("filters by max time", () => {
    const result = filterSortLoops(loops, { ...baseFilters, maxTime: 90 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });
});

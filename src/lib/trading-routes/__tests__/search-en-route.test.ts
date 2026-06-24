import { describe, expect, it } from "vitest";
import { filterSortEnRouteResults } from "@/lib/trading-routes/search-en-route";
import type { EnRouteResult } from "@/types/trading-route";

function makeResult(overrides: Partial<EnRouteResult>): EnRouteResult {
  return {
    id: "r1",
    originTerminalId: 1,
    destinationTerminalId: 2,
    originName: "Origin",
    destinationName: "Destination",
    legs: [],
    directMinutes: 30,
    totalMinutes: 35,
    totalProfit: 5000,
    profitPerMin: 142,
    detourPercent: 16,
    ...overrides,
  };
}

describe("filterSortEnRouteResults", () => {
  const results = [
    makeResult({ id: "a", totalProfit: 10000 }),
    makeResult({
      id: "b",
      totalProfit: 2000,
      legs: [
        {
          fromTerminalId: 1,
          toTerminalId: 3,
          commodityId: 10,
          commodity: "Agricium",
          profit: 2000,
          travelMinutes: 10,
          buyTerminal: "Buy",
          sellTerminal: "Sell",
        },
      ],
    }),
  ];

  it("filters by query on commodity", () => {
    const filtered = filterSortEnRouteResults(results, { query: "agricium" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("b");
  });

  it("sorts by profit per min", () => {
    const sorted = filterSortEnRouteResults(results, { sort: "profit-per-min" });
    expect(sorted[0].profitPerMin).toBeGreaterThanOrEqual(sorted[1].profitPerMin);
  });
});

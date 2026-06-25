import { describe, expect, it } from "vitest";
import { buildLoopChecklistText } from "@/features/trading-routes/loop-checklist";
import type { TradeLeg, TradeLoop } from "@/types/trading-route";

const ZERO_TRAVEL = { qt: 0, load: 0, unload: 0, overhead: 0, total: 0 };

function makeLeg(
  step: number,
  action: "buy" | "sell",
  costOrRevenue: number,
): TradeLeg {
  return {
    step,
    action,
    commodityId: 1,
    commodity: "Iron",
    terminal: {
      terminalId: step,
      terminal: action === "buy" ? "Levski" : "TDD Orison",
      location: "Levski, Levski",
      planet: "Crusader",
      system: "Stanton",
      systemId: 1,
      orbitId: 100,
      hasCargoCenter: false,
      hasFreightElevator: false,
      hasLoadingDock: true,
      hasDockingPort: true,
      isRefuel: false,
      isNqa: false,
      maxContainerSize: 32,
      price: costOrRevenue / 198,
      priceAvg: costOrRevenue / 198,
      scu: 198,
      scuStock: 198,
    },
    scuUsed: 198,
    price: costOrRevenue / 198,
    costOrRevenue,
    profitThisLeg: action === "sell" ? 208_098 : 0,
    travelFromPrev: ZERO_TRAVEL,
  };
}

function makeLoop(legs: TradeLeg[]): TradeLoop {
  return {
    id: "test-loop",
    legs,
    startTerminalId: 1,
    returnsToStart: true,
    totalProfit: 208_098,
    totalTime: 55,
    profitPerMin: 3783,
    roiPercent: 22.5,
    totalScuTurnover: 198,
    finalBudget: 1_208_098,
    commoditiesUsed: ["Iron"],
    systemsVisited: ["Stanton"],
  };
}

describe("buildLoopChecklistText", () => {
  it("shows minus for BUY and plus for SELL with a single aUEC suffix", () => {
    const text = buildLoopChecklistText(
      makeLoop([makeLeg(1, "buy", 465_102), makeLeg(2, "sell", 673_200)]),
    );

    expect(text).toContain("1. BUY 198 SCU Iron @ Levski (-465,102 aUEC)");
    expect(text).toContain("2. SELL 198 SCU Iron @ TDD Orison (+673,200 aUEC)");
    expect(text).not.toContain("aUEC aUEC");
    expect(text).not.toContain("+465,102");
  });

  it("includes loop header and totals", () => {
    const text = buildLoopChecklistText(makeLoop([makeLeg(1, "buy", 465_102)]));

    expect(text).toContain("Loop route (1 legs)");
    expect(text).toContain("Start: Levski");
    expect(text).toContain("Totals:");
  });
});

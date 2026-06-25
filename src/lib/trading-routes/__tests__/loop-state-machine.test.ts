import { describe, expect, it } from "vitest";
import type { TransitionEdge } from "@/lib/trading-routes/build-transition-graph";
import {
  applyLeg,
  canExecuteLeg,
  createInitialState,
  estimateRepositionTime,
  resolveCargoScu,
} from "@/lib/trading-routes/loop-state-machine";
import type { LoopPlannerInput, RouteLegOffer, RouteTimeEstimate } from "@/types/trading-route";

const ZERO_TRAVEL: RouteTimeEstimate = {
  qt: 0,
  load: 0,
  unload: 0,
  overhead: 0,
  total: 0,
};

function makeOffer(
  terminalId: number,
  price: number,
  scu: number,
  orbitId: number,
): RouteLegOffer {
  return {
    terminalId,
    terminal: `T${terminalId}`,
    location: `Location ${terminalId}`,
    planet: "Crusader",
    system: "Stanton",
    systemId: 1,
    orbitId,
    hasCargoCenter: false,
    hasFreightElevator: false,
    hasLoadingDock: true,
    hasDockingPort: true,
    isRefuel: false,
    isNqa: false,
    maxContainerSize: 16,
    price,
    priceAvg: price,
    scu,
    scuStock: scu,
  };
}

function makeTransitionEdge(
  fromId: number,
  toId: number,
  buyPrice: number,
  sellPrice: number,
  scu: number,
): TransitionEdge {
  const buyOffer = makeOffer(fromId, buyPrice, scu, fromId * 100);
  const sellOffer = makeOffer(toId, sellPrice, scu, toId * 100);
  const legProfitPerScu = sellPrice - buyPrice;

  return {
    fromTerminalId: fromId,
    toTerminalId: toId,
    commodityId: 10,
    commodity: "Agricium",
    commodityCode: "AGRI",
    buyOffer,
    sellOffer,
    legProfit: legProfitPerScu * scu,
    legProfitPerScu,
    effectiveScu: scu,
    travelTime: { qt: 8, load: 5, unload: 2, overhead: 3, total: 18 },
    isIllegal: false,
    isVolatileQt: false,
  };
}

const DEFAULT_PLANNER: LoopPlannerInput = {
  cargoScu: 50,
  budgetAuec: 100_000,
  crew: 1,
};

describe("loop-state-machine", () => {
  it("starts with 100k, executes buy 50 SCU and sell, budget increases", () => {
    const state = createInitialState(1, 100_000);
    const edge = makeTransitionEdge(1, 2, 1000, 1500, 50);

    expect(canExecuteLeg(state, edge, DEFAULT_PLANNER)).toBe(true);

    const next = applyLeg(state, edge, ZERO_TRAVEL, DEFAULT_PLANNER);

    expect(next.budgetAuec).toBeGreaterThan(100_000);
    expect(next.budgetAuec).toBe(125_000);
    expect(next.cargoScu).toBe(0);
    expect(next.cargoCommodityId).toBeUndefined();
    expect(next.legsCompleted).toHaveLength(2);
    expect(next.legsCompleted[0].action).toBe("buy");
    expect(next.legsCompleted[1].action).toBe("sell");
    expect(next.totalProfit).toBe(25_000);
    expect(next.currentTerminalId).toBe(2);
    expect(next.totalTimeMinutes).toBe(18);
  });

  it("clears cargo after sell", () => {
    const state = createInitialState(1, 100_000);
    const edge = makeTransitionEdge(1, 2, 1000, 1500, 50);
    const next = applyLeg(state, edge, ZERO_TRAVEL, DEFAULT_PLANNER);

    expect(next.cargoScu).toBe(0);
    expect(next.cargoCommodityId).toBeUndefined();
  });

  it("returns false from canExecuteLeg when budget is insufficient", () => {
    const state = createInitialState(1, 999);
    const edge = makeTransitionEdge(1, 2, 1000, 1500, 50);

    expect(canExecuteLeg(state, edge, DEFAULT_PLANNER)).toBe(false);
  });

  it("estimates reposition time between terminals", () => {
    const from = makeOffer(1, 0, 0, 101);
    const to = makeOffer(2, 0, 0, 102);
    const time = estimateRepositionTime(from, to, {});

    expect(time.total).toBeGreaterThan(0);
  });

  it("resolveCargoScu uses min of cargo and ship capacity", () => {
    expect(resolveCargoScu({ ...DEFAULT_PLANNER, cargoScu: 100, shipScu: 696 })).toBe(100);
    expect(resolveCargoScu({ ...DEFAULT_PLANNER, cargoScu: 500, shipScu: 696 })).toBe(500);
    expect(resolveCargoScu({ ...DEFAULT_PLANNER, cargoScu: 800, shipScu: 696 })).toBe(696);
    expect(resolveCargoScu({ ...DEFAULT_PLANNER, cargoScu: 50 })).toBe(50);
  });
});

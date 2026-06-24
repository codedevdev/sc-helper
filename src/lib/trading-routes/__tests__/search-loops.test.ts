import { describe, expect, it } from "vitest";
import type { TransitionEdge, TransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import { searchLoops } from "@/lib/trading-routes/search-loops";
import type { LoopPlannerInput, RouteLegOffer, TerminalSnapshot } from "@/types/trading-route";

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

function makeNode(terminalId: number, orbitId: number): TerminalSnapshot {
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
  };
}

function makeEdge(
  fromId: number,
  toId: number,
  buyPrice: number,
  sellPrice: number,
  scu: number,
  commodityId: number,
  commodity: string,
): TransitionEdge {
  const buyOffer = makeOffer(fromId, buyPrice, scu, fromId * 100);
  const sellOffer = makeOffer(toId, sellPrice, scu, toId * 100);
  const legProfitPerScu = sellPrice - buyPrice;

  return {
    fromTerminalId: fromId,
    toTerminalId: toId,
    commodityId,
    commodity,
    commodityCode: commodity.slice(0, 4).toUpperCase(),
    buyOffer,
    sellOffer,
    legProfit: legProfitPerScu * scu,
    legProfitPerScu,
    effectiveScu: scu,
    travelTime: { qt: 5, load: 3, unload: 2, overhead: 3, total: 13 },
    isIllegal: false,
    isVolatileQt: false,
  };
}

function createTriangleGraph(): TransitionGraph {
  const edges: TransitionEdge[] = [
    makeEdge(1, 2, 100, 150, 50, 10, "Agricium"),
    makeEdge(2, 3, 80, 120, 50, 20, "Laranite"),
    makeEdge(3, 1, 90, 130, 50, 30, "Titanium"),
    makeEdge(1, 4, 100, 101, 50, 40, "Scrap"),
    makeEdge(2, 1, 85, 125, 50, 50, "Quantainium"),
  ];

  return {
    nodes: {
      1: makeNode(1, 100),
      2: makeNode(2, 200),
      3: makeNode(3, 300),
      4: makeNode(4, 400),
    },
    edges,
  };
}

const BASE_PLANNER: LoopPlannerInput = {
  cargoScu: 50,
  budgetAuec: 100_000,
  crew: 1,
  minLegs: 3,
  maxLegs: 5,
  returnToStart: true,
  startTerminalId: 1,
};

describe("searchLoops", () => {
  it("finds a 3-hop loop on a profitable triangle", () => {
    const graph = createTriangleGraph();
    const loops = searchLoops(graph, BASE_PLANNER);

    expect(loops.length).toBeGreaterThanOrEqual(1);

    const loop = loops.find((l) => l.startTerminalId === 1 && l.returnsToStart);
    expect(loop).toBeDefined();
    expect(loop!.legs.filter((leg) => leg.action === "buy")).toHaveLength(3);
    expect(loop!.legs).toHaveLength(6);
    expect(loop!.totalProfit).toBeGreaterThan(0);
    expect(loop!.finalBudget).toBeGreaterThan(BASE_PLANNER.budgetAuec!);
  });

  it("returns loops that close at the start terminal when returnToStart is true", () => {
    const graph = createTriangleGraph();
    const loops = searchLoops(graph, BASE_PLANNER);

    expect(loops.length).toBeGreaterThan(0);
    for (const loop of loops) {
      expect(loop.returnsToStart).toBe(true);
      expect(loop.startTerminalId).toBe(1);
    }
  });

  it("does not return 2-hop paths when minLegs is 3", () => {
    const graph = createTriangleGraph();
    const loops = searchLoops(graph, BASE_PLANNER);

    for (const loop of loops) {
      expect(loop.legs.filter((leg) => leg.action === "buy").length).toBeGreaterThanOrEqual(3);
    }
  });

  it("prunes weak branches via minProfitPerMin while keeping the triangle loop", () => {
    const graph = createTriangleGraph();
    const all = searchLoops(graph, BASE_PLANNER);
    const pruned = searchLoops(graph, BASE_PLANNER, { minProfitPerMin: 50 });

    expect(all.length).toBeGreaterThan(0);
    expect(pruned.length).toBeLessThanOrEqual(all.length);

    const triangleStillFound = pruned.some(
      (loop) => loop.legs.filter((leg) => leg.action === "buy").length >= 3,
    );
    expect(triangleStillFound).toBe(true);
  });

  it("respects maxResults cap", () => {
    const graph = createTriangleGraph();
    const loops = searchLoops(graph, { ...BASE_PLANNER, startTerminalId: undefined }, {
      maxResults: 1,
    });

    expect(loops.length).toBeLessThanOrEqual(1);
  });
});

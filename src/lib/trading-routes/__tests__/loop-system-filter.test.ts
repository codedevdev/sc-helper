import { describe, expect, it } from "vitest";
import type { TransitionEdge, TransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import {
  filterGraphBySystems,
  isEdgeAllowed,
  isSystemAllowed,
  isTerminalAllowed,
} from "@/lib/trading-routes/loop-system-filter";
import { searchLoopsWithMeta } from "@/lib/trading-routes/search-loops";
import type { LoopPlannerInput, RouteLegOffer, TerminalSnapshot } from "@/types/trading-route";

function makeOffer(
  terminalId: number,
  price: number,
  scu: number,
  orbitId: number,
  system: string,
  systemId: number,
): RouteLegOffer {
  return {
    terminalId,
    terminal: `T${terminalId}`,
    location: `Location ${terminalId}`,
    planet: "Planet",
    system,
    systemId,
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

function makeNode(terminalId: number, orbitId: number, system: string, systemId: number): TerminalSnapshot {
  return {
    terminalId,
    terminal: `T${terminalId}`,
    location: `Location ${terminalId}`,
    planet: "Planet",
    system,
    systemId,
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
  fromSystem: { name: string; id: number },
  toSystem: { name: string; id: number },
): TransitionEdge {
  const buyOffer = makeOffer(fromId, buyPrice, scu, fromId * 100, fromSystem.name, fromSystem.id);
  const sellOffer = makeOffer(toId, sellPrice, scu, toId * 100, toSystem.name, toSystem.id);
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

const STANTON = { name: "Stanton", id: 1 };
const PYRO = { name: "Pyro", id: 2 };

function createMultiSystemGraph(): TransitionGraph {
  const edges: TransitionEdge[] = [
    makeEdge(1, 2, 100, 150, 50, 10, "Agricium", STANTON, STANTON),
    makeEdge(2, 3, 80, 120, 50, 20, "Laranite", STANTON, STANTON),
    makeEdge(3, 1, 90, 130, 50, 30, "Titanium", STANTON, STANTON),
    makeEdge(4, 5, 100, 150, 50, 40, "Scrap", PYRO, PYRO),
    makeEdge(5, 6, 80, 120, 50, 50, "Quantainium", PYRO, PYRO),
    makeEdge(6, 4, 90, 130, 50, 60, "Gold", PYRO, PYRO),
    makeEdge(1, 4, 100, 140, 50, 70, "Copper", STANTON, PYRO),
  ];

  return {
    nodes: {
      1: makeNode(1, 100, STANTON.name, STANTON.id),
      2: makeNode(2, 200, STANTON.name, STANTON.id),
      3: makeNode(3, 300, STANTON.name, STANTON.id),
      4: makeNode(4, 400, PYRO.name, PYRO.id),
      5: makeNode(5, 500, PYRO.name, PYRO.id),
      6: makeNode(6, 600, PYRO.name, PYRO.id),
    },
    edges,
  };
}

describe("loop-system-filter", () => {
  it("allows all systems when mode is all", () => {
    const planner: LoopPlannerInput = {
      cargoScu: 50,
      budgetAuec: 100_000,
      crew: 1,
      systemFilterMode: "all",
    };
    expect(isSystemAllowed(STANTON.id, planner)).toBe(true);
    expect(isSystemAllowed(PYRO.id, planner)).toBe(true);
  });

  it("exclude mode removes edges touching excluded systems", () => {
    const graph = createMultiSystemGraph();
    const planner: LoopPlannerInput = {
      cargoScu: 50,
      budgetAuec: 100_000,
      crew: 1,
      systemFilterMode: "exclude",
      excludedSystemIds: [PYRO.id],
    };

    const filtered = filterGraphBySystems(graph, planner);
    expect(filtered.edges.every((e) => isEdgeAllowed(e, planner))).toBe(true);
    expect(filtered.edges.some((e) => e.buyOffer.systemId === PYRO.id)).toBe(false);
    expect(filtered.edges.some((e) => e.sellOffer.systemId === PYRO.id)).toBe(false);
    expect(filtered.edges.length).toBeLessThan(graph.edges.length);
  });

  it("allow mode only keeps listed systems", () => {
    const graph = createMultiSystemGraph();
    const planner: LoopPlannerInput = {
      cargoScu: 50,
      budgetAuec: 100_000,
      crew: 1,
      systemFilterMode: "allow",
      allowedSystemIds: [STANTON.id],
    };

    const filtered = filterGraphBySystems(graph, planner);
    for (const edge of filtered.edges) {
      expect(edge.buyOffer.systemId).toBe(STANTON.id);
      expect(edge.sellOffer.systemId).toBe(STANTON.id);
    }
    expect(filtered.edges.length).toBe(3);
  });

  it("isTerminalAllowed respects exclude mode", () => {
    const planner: LoopPlannerInput = {
      cargoScu: 50,
      budgetAuec: 100_000,
      crew: 1,
      systemFilterMode: "exclude",
      excludedSystemIds: [PYRO.id],
    };
    expect(isTerminalAllowed(STANTON.id, planner)).toBe(true);
    expect(isTerminalAllowed(PYRO.id, planner)).toBe(false);
  });

  it("does not use start terminals in excluded systems", () => {
    const graph = createMultiSystemGraph();
    const planner: LoopPlannerInput = {
      cargoScu: 50,
      budgetAuec: 100_000,
      crew: 1,
      minLegs: 3,
      maxLegs: 5,
      returnToStart: true,
      systemFilterMode: "exclude",
      excludedSystemIds: [PYRO.id],
    };

    const filtered = filterGraphBySystems(graph, planner);
    const result = searchLoopsWithMeta(filtered, planner);

    for (const loop of result.loops) {
      expect(loop.systemsVisited).not.toContain(PYRO.name);
    }
  });

  it("returns truncated=true with partial loops when cap is artificially lowered", () => {
    const graph = createMultiSystemGraph();
    const filtered = filterGraphBySystems(graph, {
      cargoScu: 50,
      budgetAuec: 100_000,
      crew: 1,
      systemFilterMode: "exclude",
      excludedSystemIds: [PYRO.id],
    });

    const planner: LoopPlannerInput = {
      cargoScu: 50,
      budgetAuec: 100_000,
      crew: 1,
      minLegs: 3,
      maxLegs: 5,
      returnToStart: true,
      startTerminalId: 1,
    };

    const result = searchLoopsWithMeta(filtered, { ...planner, startTerminalId: undefined }, {
      maxExploredNodes: 1,
    });
    expect(result.truncated).toBe(true);
    expect(result.exploredNodes).toBeGreaterThanOrEqual(1);
  });
});

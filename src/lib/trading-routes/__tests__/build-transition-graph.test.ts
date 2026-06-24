import { describe, expect, it } from "vitest";
import { buildTransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import type { LoopPlannerInput } from "@/types/trading-route";
import type { Commodity, PriceListing, Terminal } from "@/lib/uex/types";

const DEFAULT_PLANNER: LoopPlannerInput = {
  cargoScu: 46,
  budgetAuec: 100_000,
  crew: 1,
};

function makeTerminal(id: number, orbitId: number, name: string): Terminal {
  return {
    id,
    id_star_system: 1,
    id_orbit: orbitId,
    nickname: name,
    name,
    star_system_name: "Stanton",
    planet_name: "Crusader",
    moon_name: null,
    orbit_name: `Orbit ${orbitId}`,
    city_name: null,
    outpost_name: null,
    space_station_name: null,
    is_cargo_center: 0,
    has_freight_elevator: 0,
    has_loading_dock: 1,
    has_docking_port: 1,
    is_refuel: 0,
    is_repair: 0,
    is_nqa: 0,
    max_container_size: 16,
  };
}

function makeCommodity(
  id: number,
  name: string,
  code: string,
  isIllegal = false,
): Commodity {
  return {
    id,
    name,
    code,
    is_illegal: isIllegal ? 1 : 0,
    is_volatile_qt: 0,
    is_buyable: 1,
    is_sellable: 1,
  };
}

function makePrice(
  id: number,
  terminalId: number,
  commodityId: number,
  buy: number,
  sell: number,
): PriceListing {
  return {
    id,
    id_terminal: terminalId,
    id_commodity: commodityId,
    price_buy: buy,
    price_buy_avg: buy,
    price_sell: sell,
    price_sell_avg: sell,
    scu_buy: 100,
    scu_buy_avg: 100,
    scu_sell: 100,
    scu_sell_avg: 100,
    scu_sell_stock: 100,
    scu_sell_stock_avg: 100,
    status_buy: null,
    status_sell: null,
  };
}

function createMockMarket() {
  const terminals = [
    makeTerminal(1, 101, "T1 Port"),
    makeTerminal(2, 102, "T2 Outpost"),
    makeTerminal(3, 103, "T3 Station"),
    makeTerminal(4, 104, "T4 Hub"),
  ];

  const commodities = [
    makeCommodity(10, "Agricium", "AGRI"),
    makeCommodity(20, "Laranite", "LARA"),
    makeCommodity(30, "WiDoW", "WIDOW", true),
  ];

  const prices: PriceListing[] = [
    // Commodity A: profitable T1 -> T2 only (T3 sell too low for profit from T1)
    makePrice(1, 1, 10, 100, 90),
    makePrice(2, 2, 10, 110, 150),
    makePrice(3, 3, 10, 210, 80),
    // Commodity B: profitable T2 -> T3
    makePrice(4, 2, 20, 80, 70),
    makePrice(5, 3, 20, 90, 120),
    // Same-terminal trap: spread > 0 but buy and sell at T4
    makePrice(6, 4, 20, 50, 120),
    // Illegal commodity: profitable T1 -> T3 (for excludeIllegal test)
    makePrice(7, 1, 30, 100, 90),
    makePrice(8, 3, 30, 110, 200),
  ];

  return { terminals, commodities, prices };
}

describe("buildTransitionGraph", () => {
  it("creates profitable edges and filters unprofitable and same-terminal pairs", () => {
    const market = createMockMarket();
    const graph = buildTransitionGraph(market, DEFAULT_PLANNER);

    expect(graph.edges.length).toBeGreaterThanOrEqual(2);

    for (const edge of graph.edges) {
      expect(edge.fromTerminalId).not.toBe(edge.toTerminalId);
      expect(edge.legProfit).toBeGreaterThan(0);
      expect(edge.legProfitPerScu).toBeGreaterThan(0);
      expect(edge.effectiveScu).toBeGreaterThan(0);
      expect(edge.travelTime.total).toBeGreaterThan(0);

      expect(graph.nodes[edge.fromTerminalId]).toBeDefined();
      expect(graph.nodes[edge.toTerminalId]).toBeDefined();
      expect(graph.nodes[edge.fromTerminalId].terminalId).toBe(edge.fromTerminalId);
      expect(graph.nodes[edge.toTerminalId].terminalId).toBe(edge.toTerminalId);
    }

    const agriciumEdges = graph.edges.filter((e) => e.commodityId === 10);
    expect(agriciumEdges.some((e) => e.fromTerminalId === 1 && e.toTerminalId === 2)).toBe(
      true,
    );
    expect(agriciumEdges.some((e) => e.fromTerminalId === 1 && e.toTerminalId === 3)).toBe(
      false,
    );

    const laraniteEdges = graph.edges.filter((e) => e.commodityId === 20);
    expect(laraniteEdges.some((e) => e.fromTerminalId === 2 && e.toTerminalId === 3)).toBe(
      true,
    );
    expect(laraniteEdges.some((e) => e.fromTerminalId === 4 && e.toTerminalId === 4)).toBe(
      false,
    );
  });

  it("excludes illegal commodities when excludeIllegal is true", () => {
    const market = createMockMarket();
    const withIllegal = buildTransitionGraph(market, DEFAULT_PLANNER);
    const withoutIllegal = buildTransitionGraph(market, {
      ...DEFAULT_PLANNER,
      excludeIllegal: true,
    });

    expect(withIllegal.edges.some((e) => e.commodityId === 30)).toBe(true);
    expect(withoutIllegal.edges.some((e) => e.commodityId === 30)).toBe(false);
  });
});

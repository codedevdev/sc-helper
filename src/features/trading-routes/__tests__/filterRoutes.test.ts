import { describe, expect, it } from "vitest";
import { filterTradingRoutes } from "@/features/trading-routes/filterRoutes";
import type { TradingRoute, TradingRouteFilters } from "@/types/trading-route";

const baseFilters: TradingRouteFilters = {
  legality: "all",
  sameSystem: "all",
  cargoCenter: "all",
  sort: "total-profit",
};

function makeRoute(overrides: Partial<TradingRoute> & Pick<TradingRoute, "commodity">): TradingRoute {
  return {
    commodityId: 1,
    commodityCode: "TEST",
    isIllegal: false,
    isVolatileQt: false,
    profitPerScu: 10,
    effectiveScu: 24,
    grossProfit: 1000,
    totalCost: 5000,
    roiPercent: 20,
    profitPerMin: 50,
    distanceGm: 10,
    buy: {
      terminalId: 1,
      terminal: "Buy Terminal",
      location: "Loc",
      planet: "Hurston",
      system: "Stanton",
      systemId: 1,
      orbitId: 1,
      hasCargoCenter: true,
      hasFreightElevator: false,
      hasLoadingDock: false,
      hasDockingPort: true,
      isRefuel: false,
      isNqa: false,
      maxContainerSize: 16,
      price: 100,
      priceAvg: 100,
      scu: 100,
    },
    sell: {
      terminalId: 2,
      terminal: "Sell Terminal",
      location: "Loc",
      planet: "Crusader",
      system: "Stanton",
      systemId: 1,
      orbitId: 2,
      hasCargoCenter: false,
      hasFreightElevator: true,
      hasLoadingDock: false,
      hasDockingPort: true,
      isRefuel: false,
      isNqa: false,
      maxContainerSize: 8,
      price: 120,
      priceAvg: 120,
      scu: 100,
      scuStock: 50,
    },
    time: { qt: 5, load: 2, unload: 2, overhead: 1, total: 10 },
    ...overrides,
  } as TradingRoute;
}

describe("filterTradingRoutes", () => {
  const routes = [
    makeRoute({ commodity: "Agricium" }),
    makeRoute({
      commodity: "Laranite",
      buy: { ...makeRoute({ commodity: "x" }).buy, system: "Pyro", hasCargoCenter: false, hasFreightElevator: false, hasLoadingDock: false },
      sell: { ...makeRoute({ commodity: "x" }).sell, system: "Pyro", scuStock: 5, hasCargoCenter: false, hasFreightElevator: false, hasLoadingDock: false },
      isIllegal: true,
      isVolatileQt: true,
    }),
  ];

  it("filters by text query", () => {
    const result = filterTradingRoutes(routes, { ...baseFilters, query: "agricium" });
    expect(result).toHaveLength(1);
    expect(result[0].commodity).toBe("Agricium");
  });

  it("filters by min stock", () => {
    const result = filterTradingRoutes(routes, { ...baseFilters, minStock: 20 });
    expect(result).toHaveLength(1);
    expect(result[0].commodity).toBe("Agricium");
  });

  it("filters autoload only", () => {
    const result = filterTradingRoutes(routes, { ...baseFilters, autoloadOnly: true });
    expect(result).toHaveLength(1);
    expect(result[0].commodity).toBe("Agricium");
  });

  it("filters buy and sell systems separately", () => {
    const result = filterTradingRoutes(routes, {
      ...baseFilters,
      sellSystem: "Pyro",
    });
    expect(result).toHaveLength(1);
    expect(result[0].commodity).toBe("Laranite");
  });

  it("excludes volatile commodities", () => {
    const result = filterTradingRoutes(routes, { ...baseFilters, excludeVolatileQt: true });
    expect(result.every((r) => !r.isVolatileQt)).toBe(true);
  });
});

import type { RouteLegOffer, TradeLoop, TradingRoute } from "@/types/trading-route";

export function hasAutoload(leg: RouteLegOffer): boolean {
  return leg.hasCargoCenter || leg.hasFreightElevator || leg.hasLoadingDock;
}

export function routeMatchesQuery(route: TradingRoute, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    route.commodity,
    route.commodityCode,
    route.buy.terminal,
    route.sell.terminal,
    route.buy.planet,
    route.sell.planet,
    route.buy.system,
    route.sell.system,
    route.buy.location,
    route.sell.location,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function loopMatchesQuery(loop: TradeLoop, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    ...loop.commoditiesUsed,
    ...loop.systemsVisited,
    ...loop.legs.map((leg) => leg.terminal.terminal),
    ...loop.legs.map((leg) => leg.terminal.planet),
    ...loop.legs.map((leg) => leg.terminal.system),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function loopMinSellStock(loop: TradeLoop): number | null {
  let min: number | null = null;
  for (const leg of loop.legs) {
    if (leg.action !== "sell") continue;
    const stock = leg.terminal.scuStock ?? leg.terminal.scu;
    if (stock == null || stock <= 0) continue;
    min = min == null ? stock : Math.min(min, stock);
  }
  return min;
}

export function stockSeverity(
  stock: number | undefined,
  plannedScu: number,
): "ok" | "warning" | "danger" | "unknown" {
  if (stock == null || stock <= 0) return "unknown";
  if (stock < plannedScu) return "danger";
  if (stock < plannedScu * 0.5) return "warning";
  return "ok";
}

export const CONTAINER_SIZE_OPTIONS = [1, 2, 4, 8, 16, 24, 32] as const;

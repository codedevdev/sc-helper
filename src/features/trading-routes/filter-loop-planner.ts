import type { LoopPlannerFilters, TradeLoop } from "@/types/trading-route";
import { loopMatchesQuery } from "./route-filter-utils";

function hopCount(loop: TradeLoop): number {
  return loop.legs.filter((leg) => leg.action === "buy").length;
}

function compareLoops(a: TradeLoop, b: TradeLoop, sort: LoopPlannerFilters["sort"]): number {
  switch (sort) {
    case "total-profit":
      return b.totalProfit - a.totalProfit;
    case "profit-per-min":
      return b.profitPerMin - a.profitPerMin;
    case "total-time":
      return a.totalTime - b.totalTime;
    case "leg-count":
      return hopCount(b) - hopCount(a);
    default:
      return b.profitPerMin - a.profitPerMin;
  }
}

function passesLoopFilters(loop: TradeLoop, filters: LoopPlannerFilters): boolean {
  if (filters.minProfit != null && filters.minProfit > 0 && loop.totalProfit < filters.minProfit) {
    return false;
  }
  if (filters.maxTime != null && filters.maxTime > 0 && loop.totalTime > filters.maxTime) {
    return false;
  }

  if (filters.commodity?.trim()) {
    const commodity = filters.commodity.trim().toLowerCase();
    if (!loop.commoditiesUsed.some((c) => c.toLowerCase() === commodity)) return false;
  }

  if (filters.system?.trim()) {
    const system = filters.system.trim().toLowerCase();
    if (!loop.systemsVisited.some((s) => s.toLowerCase() === system)) return false;
  }

  if (filters.terminal?.trim()) {
    const terminal = filters.terminal.trim().toLowerCase();
    const matches = loop.legs.some((leg) =>
      leg.terminal.terminal.toLowerCase().includes(terminal),
    );
    if (!matches) return false;
  }

  if (filters.query?.trim() && !loopMatchesQuery(loop, filters.query)) return false;

  return true;
}

export function filterSortLoops(
  loops: TradeLoop[],
  filters: LoopPlannerFilters,
): TradeLoop[] {
  return loops
    .filter((loop) => passesLoopFilters(loop, filters))
    .sort((a, b) => compareLoops(a, b, filters.sort));
}

export function countActiveLoopFilters(filters: LoopPlannerFilters): number {
  let count = 0;
  if (filters.query?.trim()) count++;
  if (filters.commodity?.trim()) count++;
  if (filters.system?.trim()) count++;
  if (filters.terminal?.trim()) count++;
  if (filters.minProfit != null && filters.minProfit > 0) count++;
  if (filters.maxTime != null && filters.maxTime > 0) count++;
  return count;
}

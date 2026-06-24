import { buildTransitionGraph, type TransitionEdge } from "@/lib/trading-routes/build-transition-graph";
import { estimateTravelTime } from "@/lib/trading-routes/estimate-travel-time";
import type { OrbitDistanceMap, TradeRouteMarketInput } from "@/lib/trading-routes/types";
import type { EnRoutePlannerInput, EnRouteResult } from "@/types/trading-route";

export interface SearchEnRouteOptions {
  maxResults?: number;
}

interface SearchFrame {
  currentTerminalId: number;
  legs: TransitionEdge[];
  timeMinutes: number;
  profit: number;
}

function terminalName(nodes: ReturnType<typeof buildTransitionGraph>["nodes"], id: number): string {
  return nodes[id]?.terminal ?? `Terminal ${id}`;
}

function edgesFromTerminal(
  edges: TransitionEdge[],
  terminalId: number,
): TransitionEdge[] {
  return edges.filter((e) => e.fromTerminalId === terminalId);
}

export function searchEnRoute(
  market: TradeRouteMarketInput,
  planner: EnRoutePlannerInput,
  orbitDistances: OrbitDistanceMap = {},
  options: SearchEnRouteOptions = {},
): EnRouteResult[] {
  const maxResults = options.maxResults ?? 20;
  const originId = planner.originTerminalId;
  const destId = planner.destinationTerminalId;
  const maxStops = planner.maxStops ?? 3;
  const detourPercent = planner.maxDetourPercent ?? 25;

  if (!originId || !destId || originId === destId) return [];

  const graph = buildTransitionGraph(market, planner, orbitDistances);
  const originNode = graph.nodes[originId];
  const destNode = graph.nodes[destId];
  if (!originNode || !destNode) return [];

  const directEstimate = estimateTravelTime(originNode, destNode, {
    cargoScu: planner.cargoScu,
    crew: planner.crew ?? 1,
    orbitDistances,
  });
  const directMinutes = directEstimate.total;
  const maxMinutes = directMinutes * (1 + detourPercent / 100);

  const results: EnRouteResult[] = [];
  const seen = new Set<string>();

  function recordResult(legs: TransitionEdge[], timeMinutes: number, profit: number) {
    const key = legs.map((l) => `${l.fromTerminalId}-${l.toTerminalId}-${l.commodityId}`).join("|");
    if (seen.has(key)) return;
    seen.add(key);

    const detour =
      directMinutes > 0 ? ((timeMinutes - directMinutes) / directMinutes) * 100 : 0;

    results.push({
      id: key || `direct-${originId}-${destId}`,
      originTerminalId: originId,
      destinationTerminalId: destId,
      originName: terminalName(graph.nodes, originId),
      destinationName: terminalName(graph.nodes, destId),
      legs: legs.map((edge) => ({
        fromTerminalId: edge.fromTerminalId,
        toTerminalId: edge.toTerminalId,
        commodityId: edge.commodityId,
        commodity: edge.commodity,
        profit: edge.legProfit,
        travelMinutes: edge.travelTime.total,
        buyTerminal: edge.buyOffer.terminal,
        sellTerminal: edge.sellOffer.terminal,
      })),
      directMinutes,
      totalMinutes: timeMinutes,
      totalProfit: profit,
      profitPerMin: timeMinutes > 0 ? profit / timeMinutes : 0,
      detourPercent: detour,
    });
  }

  function tryFinish(currentTerminalId: number, legs: TransitionEdge[], timeMinutes: number, profit: number) {
    if (currentTerminalId === destId) {
      if (timeMinutes <= maxMinutes) recordResult(legs, timeMinutes, profit);
      return;
    }

    const currentNode = graph.nodes[currentTerminalId];
    const dest = graph.nodes[destId];
    if (!currentNode || !dest) return;

    const hop = estimateTravelTime(currentNode, dest, {
      cargoScu: planner.cargoScu,
      crew: planner.crew ?? 1,
      orbitDistances,
    });
    const totalTime = timeMinutes + hop.total;
    if (totalTime <= maxMinutes) {
      recordResult(legs, totalTime, profit);
    }
  }

  function dfs(frame: SearchFrame) {
    if (results.length >= maxResults * 3) return;

    tryFinish(frame.currentTerminalId, frame.legs, frame.timeMinutes, frame.profit);

    if (frame.legs.length >= maxStops) return;

    for (const edge of edgesFromTerminal(graph.edges, frame.currentTerminalId)) {
      const nextTime = frame.timeMinutes + edge.travelTime.total;
      if (nextTime > maxMinutes) continue;

      dfs({
        currentTerminalId: edge.toTerminalId,
        legs: [...frame.legs, edge],
        timeMinutes: nextTime,
        profit: frame.profit + edge.legProfit,
      });
    }
  }

  dfs({
    currentTerminalId: originId,
    legs: [],
    timeMinutes: 0,
    profit: 0,
  });

  tryFinish(originId, [], 0, 0);

  return results
    .sort((a, b) => b.totalProfit - a.totalProfit || a.totalMinutes - b.totalMinutes)
    .slice(0, maxResults);
}

export function filterSortEnRouteResults(
  results: EnRouteResult[],
  filters: { sort?: "total-profit" | "profit-per-min" | "total-time"; query?: string; minProfit?: number },
): EnRouteResult[] {
  let list = results;

  if (filters.minProfit != null && filters.minProfit > 0) {
    list = list.filter((r) => r.totalProfit >= filters.minProfit!);
  }

  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter((r) => {
      const haystack = [
        r.originName,
        r.destinationName,
        ...r.legs.map((l) => l.commodity),
        ...r.legs.map((l) => l.buyTerminal),
        ...r.legs.map((l) => l.sellTerminal),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  const sort = filters.sort ?? "total-profit";
  return [...list].sort((a, b) => {
    switch (sort) {
      case "profit-per-min":
        return b.profitPerMin - a.profitPerMin;
      case "total-time":
        return a.totalMinutes - b.totalMinutes;
      default:
        return b.totalProfit - a.totalProfit;
    }
  });
}

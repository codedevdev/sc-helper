import { buildTradePairs } from "@/lib/trading-routes/build-trade-pairs";
import {
  MAX_LOOP_CANDIDATES,
  MAX_LOOP_LEGS,
  MIN_LOOP_LEGS,
} from "@/lib/trading-routes/constants";
import type { RoutePairBuildFilters, TradeRouteMarketInput } from "@/lib/trading-routes/types";
import type {
  LoopLeg,
  TradingLoopCandidate,
  TradingRouteCandidate,
} from "@/types/trading-route";

export interface LoopBuildResult {
  candidates: TradingLoopCandidate[];
  singleLegCandidates: TradingRouteCandidate[];
}

function candidateToLoopLeg(candidate: TradingRouteCandidate): LoopLeg {
  return {
    commodityId: candidate.commodityId,
    commodity: candidate.commodity,
    commodityCode: candidate.commodityCode,
    isIllegal: candidate.isIllegal,
    isVolatileQt: candidate.isVolatileQt,
    buy: candidate.buy,
    sell: candidate.sell,
  };
}

function loopId(legs: LoopLeg[]): string {
  return legs
    .map((l) => `${l.commodityId}:${l.buy.terminalId}:${l.sell.terminalId}`)
    .join("|");
}

function indexCandidatesByBuyTerminal(
  candidates: TradingRouteCandidate[],
): Map<number, TradingRouteCandidate[]> {
  const map = new Map<number, TradingRouteCandidate[]>();
  for (const candidate of candidates) {
    const list = map.get(candidate.buy.terminalId) ?? [];
    list.push(candidate);
    map.set(candidate.buy.terminalId, list);
  }
  return map;
}

function searchLoopsFromStart(
  start: TradingRouteCandidate,
  byBuyTerminal: Map<number, TradingRouteCandidate[]>,
  seen: Set<string>,
  results: TradingLoopCandidate[],
): void {
  const startTerminalId = start.buy.terminalId;

  function dfs(path: LoopLeg[], visitedTerminals: Set<number>): void {
    if (results.length >= MAX_LOOP_CANDIDATES) return;

    const lastLeg = path[path.length - 1];
    const atClosing =
      path.length >= MIN_LOOP_LEGS && lastLeg.sell.terminalId === startTerminalId;

    if (atClosing) {
      const id = loopId(path);
      if (!seen.has(id)) {
        seen.add(id);
        results.push({ id, legs: [...path] });
      }
    }

    if (path.length >= MAX_LOOP_LEGS) return;

    const nextTerminalId = lastLeg.sell.terminalId;
    const nextCandidates = byBuyTerminal.get(nextTerminalId) ?? [];

    for (const next of nextCandidates) {
      if (next.sell.terminalId === next.buy.terminalId) continue;

      const closesLoop = next.sell.terminalId === startTerminalId;
      if (
        visitedTerminals.has(next.sell.terminalId) &&
        !(closesLoop && path.length + 1 >= MIN_LOOP_LEGS)
      ) {
        continue;
      }

      const nextPath = [...path, candidateToLoopLeg(next)];
      const nextVisited = new Set(visitedTerminals);
      if (!closesLoop) {
        nextVisited.add(next.sell.terminalId);
      }

      dfs(nextPath, nextVisited);
    }
  }

  dfs([candidateToLoopLeg(start)], new Set([start.sell.terminalId]));
}

export function buildLoopRoutes(
  market: TradeRouteMarketInput,
  filters?: RoutePairBuildFilters,
): LoopBuildResult {
  const { candidates: singleLegCandidates } = buildTradePairs(market, filters);
  const byBuyTerminal = indexCandidatesByBuyTerminal(singleLegCandidates);

  const seen = new Set<string>();
  const candidates: TradingLoopCandidate[] = [];

  for (const start of singleLegCandidates) {
    if (candidates.length >= MAX_LOOP_CANDIDATES) break;
    searchLoopsFromStart(start, byBuyTerminal, seen, candidates);
  }

  return { candidates, singleLegCandidates };
}

/** Legacy signature for worker: prices, terminals, commodities as separate args. */
export function buildLoopRoutesFromArrays(
  prices: TradeRouteMarketInput["prices"],
  terminals: TradeRouteMarketInput["terminals"],
  commodities: TradeRouteMarketInput["commodities"],
  filters?: RoutePairBuildFilters,
): LoopBuildResult {
  return buildLoopRoutes({ prices, terminals, commodities }, filters);
}

export function loopCommoditySummary(legs: LoopLeg[]): string {
  const unique = [...new Set(legs.map((l) => l.commodity))];
  if (unique.length <= 2) return unique.join(" → ");
  return `${unique[0]} → … → ${unique[unique.length - 1]} (${legs.length} legs)`;
}

export function loopTerminalPath(legs: LoopLeg[]): string {
  if (legs.length === 0) return "";
  const parts = [legs[0].buy.terminal];
  for (const leg of legs) {
    parts.push(leg.sell.terminal);
  }
  return parts.join(" → ");
}

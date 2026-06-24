import type { TransitionEdge, TransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import {
  DEFAULT_MAX_LOOP_RESULTS,
  HEAVY_LOOP_EDGE_THRESHOLD,
  MAX_LOOP_EXPLORED_NODES,
  MAX_LOOP_LEGS,
  TOP_LOOP_START_TERMINALS,
  TOP_LOOP_START_TERMINALS_HEAVY,
} from "@/lib/trading-routes/constants";
import {
  applyLeg,
  canExecuteLeg,
  createInitialState,
  estimateRepositionTime,
  type LoopState,
} from "@/lib/trading-routes/loop-state-machine";
import { isEdgeAllowed, isTerminalAllowed } from "@/lib/trading-routes/loop-system-filter";
import type { OrbitDistanceMap } from "@/lib/trading-routes/types";
import type { LoopPlannerInput, TerminalSnapshot, TradeLeg, TradeLoop } from "@/types/trading-route";

export interface SearchLoopsOptions {
  maxResults?: number;
  minProfitPerMin?: number;
  orbitDistances?: OrbitDistanceMap;
  maxExploredNodes?: number;
}

export interface SearchLoopsResult {
  loops: TradeLoop[];
  truncated: boolean;
  exploredNodes: number;
}

interface ResolvedPlanner extends LoopPlannerInput {
  minLegs: number;
  maxLegs: number;
  returnToStart: boolean;
  sameSystemOnly: boolean;
  allowMixedCommodities: boolean;
}

interface DfsFrame {
  startTerminalId: number;
  state: LoopState;
  hopCount: number;
  visitedTerminals: Set<number>;
  commoditiesInPath: Set<number>;
  edgesPath: TransitionEdge[];
}

function resolvePlannerDefaults(planner: LoopPlannerInput): ResolvedPlanner {
  return {
    ...planner,
    minLegs: planner.minLegs ?? 3,
    maxLegs: Math.min(planner.maxLegs ?? 5, MAX_LOOP_LEGS),
    returnToStart: planner.returnToStart ?? true,
    sameSystemOnly: planner.sameSystemOnly ?? false,
    allowMixedCommodities: planner.allowMixedCommodities ?? true,
    systemFilterMode: planner.systemFilterMode ?? "all",
    allowedSystemIds: planner.allowedSystemIds ?? [],
    excludedSystemIds: planner.excludedSystemIds ?? [],
  };
}

function indexEdgesByFrom(edges: TransitionEdge[]): Map<number, TransitionEdge[]> {
  const map = new Map<number, TransitionEdge[]>();
  for (const edge of edges) {
    const list = map.get(edge.fromTerminalId) ?? [];
    list.push(edge);
    map.set(edge.fromTerminalId, list);
  }
  for (const [terminalId, list] of map) {
    list.sort((a, b) => b.legProfitPerScu - a.legProfitPerScu);
    map.set(terminalId, list);
  }
  return map;
}

function resolveStartTerminals(
  planner: ResolvedPlanner,
  graph: TransitionGraph,
  edgesByFrom: Map<number, TransitionEdge[]>,
): number[] {
  if (planner.startTerminalId != null) {
    const node = graph.nodes[planner.startTerminalId];
    if (node && isTerminalAllowed(node.systemId, planner)) {
      return [planner.startTerminalId];
    }
    return [];
  }

  const maxStarts =
    graph.edges.length > HEAVY_LOOP_EDGE_THRESHOLD
      ? TOP_LOOP_START_TERMINALS_HEAVY
      : TOP_LOOP_START_TERMINALS;

  const counts = new Map<number, number>();
  for (const [terminalId, edges] of edgesByFrom) {
    const node = graph.nodes[terminalId];
    if (node && !isTerminalAllowed(node.systemId, planner)) continue;
    counts.set(terminalId, edges.length);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxStarts)
    .map(([terminalId]) => terminalId);
}

function hopSignature(edgesPath: TransitionEdge[]): string {
  const hops = edgesPath.map(
    (e) => `${e.fromTerminalId}->${e.toTerminalId}:${e.commodityId}`,
  );
  if (hops.length === 0) return "";

  let best = hops.join("|");
  for (let i = 1; i < hops.length; i++) {
    const rotated = [...hops.slice(i), ...hops.slice(0, i)].join("|");
    if (rotated < best) best = rotated;
  }
  return best;
}

function buildTradeLoop(
  startTerminalId: number,
  state: LoopState,
  edgesPath: TransitionEdge[],
  returnToStart: boolean,
): TradeLoop {
  const signature = hopSignature(edgesPath);
  const totalTime = state.totalTimeMinutes;
  const totalProfit = state.totalProfit;

  let totalBuyCost = 0;
  let totalScuTurnover = 0;
  const commoditiesUsed: string[] = [];
  const commoditiesSeen = new Set<string>();
  const systemsVisited: string[] = [];
  const systemsSeen = new Set<string>();

  for (const leg of state.legsCompleted) {
    if (leg.action === "buy") {
      totalBuyCost += leg.costOrRevenue;
      totalScuTurnover += leg.scuUsed;
      if (!commoditiesSeen.has(leg.commodity)) {
        commoditiesSeen.add(leg.commodity);
        commoditiesUsed.push(leg.commodity);
      }
      if (leg.terminal.system && !systemsSeen.has(leg.terminal.system)) {
        systemsSeen.add(leg.terminal.system);
        systemsVisited.push(leg.terminal.system);
      }
    }
  }

  return {
    id: signature,
    legs: state.legsCompleted,
    startTerminalId,
    returnsToStart: returnToStart,
    totalProfit,
    totalTime,
    profitPerMin: totalTime > 0 ? totalProfit / totalTime : 0,
    totalScuTurnover,
    commoditiesUsed,
    systemsVisited,
    finalBudget: state.budgetAuec,
    roiPercent: totalBuyCost > 0 ? (totalProfit / totalBuyCost) * 100 : 0,
  };
}

function getTerminalNode(
  graph: TransitionGraph,
  terminalId: number,
  fallback?: TerminalSnapshot,
): TerminalSnapshot {
  return graph.nodes[terminalId] ?? fallback ?? {
    terminalId,
    terminal: `T${terminalId}`,
    location: "",
    planet: "",
    system: "",
    systemId: 0,
    orbitId: 0,
    hasCargoCenter: false,
    hasFreightElevator: false,
    hasLoadingDock: false,
    hasDockingPort: false,
    isRefuel: false,
    isNqa: false,
    maxContainerSize: 16,
  };
}

function shouldPrune(
  state: LoopState,
  planner: ResolvedPlanner,
  minProfitPerMin: number,
): boolean {
  if (state.budgetAuec < 0) return true;
  if (
    planner.maxTotalTimeMinutes != null &&
    state.totalTimeMinutes > planner.maxTotalTimeMinutes
  ) {
    return true;
  }
  if (minProfitPerMin > 0) {
    const profitPerMin = state.totalProfit / Math.max(state.totalTimeMinutes, 1);
    if (profitPerMin < minProfitPerMin) return true;
  }
  return false;
}

function passesSameSystemFilter(
  graph: TransitionGraph,
  startTerminalId: number,
  edge: TransitionEdge,
  planner: ResolvedPlanner,
): boolean {
  if (!planner.sameSystemOnly) return true;
  const startSystem = getTerminalNode(graph, startTerminalId).system;
  if (!startSystem) return true;
  return (
    edge.buyOffer.system === startSystem &&
    edge.sellOffer.system === startSystem
  );
}

function countHops(legs: TradeLeg[]): number {
  return legs.filter((l) => l.action === "buy").length;
}

export function searchLoopsWithMeta(
  graph: TransitionGraph,
  plannerInput: LoopPlannerInput,
  options: SearchLoopsOptions = {},
): SearchLoopsResult {
  const planner = resolvePlannerDefaults(plannerInput);
  const maxResults = options.maxResults ?? DEFAULT_MAX_LOOP_RESULTS;
  const minProfitPerMin = options.minProfitPerMin ?? 0;
  const orbitDistances = options.orbitDistances ?? {};
  const maxExplored = options.maxExploredNodes ?? MAX_LOOP_EXPLORED_NODES;
  const travelOpts = { crew: planner.crew ?? 1 };

  const edgesByFrom = indexEdgesByFrom(graph.edges);
  const startTerminals = resolveStartTerminals(planner, graph, edgesByFrom);

  const results: TradeLoop[] = [];
  const seenSignatures = new Set<string>();
  let explored = 0;
  let truncated = false;

  function tryRecordLoop(frame: DfsFrame): void {
    const { startTerminalId, state, edgesPath } = frame;
    const hops = countHops(state.legsCompleted);

    if (hops < planner.minLegs || hops > planner.maxLegs) return;

    const atStart = state.currentTerminalId === startTerminalId;
    if (planner.returnToStart && !atStart) return;
    if (!planner.returnToStart && hops < planner.minLegs) return;

    const signature = hopSignature(edgesPath);
    if (seenSignatures.has(signature)) return;

    seenSignatures.add(signature);
    results.push(
      buildTradeLoop(startTerminalId, state, edgesPath, planner.returnToStart && atStart),
    );
  }

  function dfs(frame: DfsFrame): void {
    if (explored >= maxExplored) {
      truncated = true;
      return;
    }
    explored++;

    const { state, hopCount, visitedTerminals, commoditiesInPath, edgesPath } = frame;
    const outgoing = edgesByFrom.get(state.currentTerminalId) ?? [];

    for (const edge of outgoing) {
      if (!canExecuteLeg(state, edge, planner)) continue;
      if (!isEdgeAllowed(edge, planner)) continue;
      if (!passesSameSystemFilter(graph, frame.startTerminalId, edge, planner)) continue;
      if (!planner.allowMixedCommodities && commoditiesInPath.has(edge.commodityId)) {
        continue;
      }

      const closesAtStart =
        edge.toTerminalId === frame.startTerminalId && hopCount + 1 >= planner.minLegs;
      if (visitedTerminals.has(edge.toTerminalId) && !closesAtStart) continue;

      const fromNode = getTerminalNode(graph, state.currentTerminalId, edge.buyOffer);
      const travelToNext = estimateRepositionTime(
        fromNode,
        edge.buyOffer,
        orbitDistances,
        travelOpts,
      );

      const nextState = applyLeg(state, edge, travelToNext, planner);
      if (shouldPrune(nextState, planner, minProfitPerMin)) continue;

      const nextHopCount = hopCount + 1;
      const nextEdgesPath = [...edgesPath, edge];
      const nextFrame: DfsFrame = {
        startTerminalId: frame.startTerminalId,
        state: nextState,
        hopCount: nextHopCount,
        visitedTerminals: new Set(visitedTerminals),
        commoditiesInPath: new Set(commoditiesInPath),
        edgesPath: nextEdgesPath,
      };

      if (closesAtStart && planner.returnToStart) {
        tryRecordLoop(nextFrame);
      } else if (!planner.returnToStart && nextHopCount >= planner.minLegs) {
        tryRecordLoop(nextFrame);
      }

      if (nextHopCount >= planner.maxLegs) continue;

      if (edge.toTerminalId !== frame.startTerminalId) {
        nextFrame.visitedTerminals.add(edge.toTerminalId);
      }
      nextFrame.commoditiesInPath.add(edge.commodityId);

      dfs(nextFrame);
    }
  }

  for (const startTerminalId of startTerminals) {
    const initialState = createInitialState(startTerminalId, planner.budgetAuec);
    dfs({
      startTerminalId,
      state: initialState,
      hopCount: 0,
      visitedTerminals: new Set(),
      commoditiesInPath: new Set(),
      edgesPath: [],
    });
  }

  const loops = results
    .sort((a, b) => b.profitPerMin - a.profitPerMin)
    .slice(0, maxResults);

  return { loops, truncated, exploredNodes: explored };
}

export function searchLoops(
  graph: TransitionGraph,
  plannerInput: LoopPlannerInput,
  options: SearchLoopsOptions = {},
): TradeLoop[] {
  return searchLoopsWithMeta(graph, plannerInput, options).loops;
}

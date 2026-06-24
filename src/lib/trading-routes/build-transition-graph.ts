import { buildTradePairs } from "@/lib/trading-routes/build-trade-pairs";
import { computeScuUsed } from "@/lib/trading-routes/calculate-metrics";
import { estimateTravelTime } from "@/lib/trading-routes/estimate-travel-time";
import { filterGraphBySystems } from "@/lib/trading-routes/loop-system-filter";
import type { OrbitDistanceMap, TradeRouteMarketInput } from "@/lib/trading-routes/types";
import type {
  LoopPlannerInput,
  RouteLegOffer,
  RouteTimeEstimate,
  TerminalSnapshot,
  TradingRouteCandidate,
} from "@/types/trading-route";

export interface TransitionEdge {
  fromTerminalId: number;
  toTerminalId: number;
  commodityId: number;
  commodity: string;
  commodityCode: string;
  buyOffer: RouteLegOffer;
  sellOffer: RouteLegOffer;
  legProfit: number;
  legProfitPerScu: number;
  effectiveScu: number;
  travelTime: RouteTimeEstimate;
  isIllegal: boolean;
  isVolatileQt: boolean;
}

export interface TransitionGraph {
  nodes: Record<number, TerminalSnapshot>;
  edges: TransitionEdge[];
}

function offerToSnapshot(offer: RouteLegOffer): TerminalSnapshot {
  return {
    terminalId: offer.terminalId,
    terminal: offer.terminal,
    location: offer.location,
    planet: offer.planet,
    system: offer.system,
    systemId: offer.systemId,
    orbitId: offer.orbitId,
    hasCargoCenter: offer.hasCargoCenter,
    hasFreightElevator: offer.hasFreightElevator,
    hasLoadingDock: offer.hasLoadingDock,
    hasDockingPort: offer.hasDockingPort,
    isRefuel: offer.isRefuel,
    isNqa: offer.isNqa,
    maxContainerSize: offer.maxContainerSize,
  };
}

function addNode(nodes: Record<number, TerminalSnapshot>, offer: RouteLegOffer): void {
  nodes[offer.terminalId] = offerToSnapshot(offer);
}

function candidateToEdge(
  candidate: TradingRouteCandidate,
  plannerInput: LoopPlannerInput,
  orbitDistances: OrbitDistanceMap,
): TransitionEdge | null {
  if (
    plannerInput.requireCargoCenter &&
    (!candidate.buy.hasCargoCenter || !candidate.sell.hasCargoCenter)
  ) {
    return null;
  }

  const legProfitPerScu = candidate.sell.price - candidate.buy.price;
  if (legProfitPerScu <= 0) return null;

  const cargoScu =
    plannerInput.shipScu != null && plannerInput.shipScu > 0
      ? plannerInput.shipScu
      : plannerInput.cargoScu;

  const effectiveScu = computeScuUsed(
    candidate.buy.price,
    candidate.buy.scu,
    candidate.sell.scu,
    {
      cargoScu,
      budgetAuec: plannerInput.budgetAuec,
      crew: plannerInput.crew ?? 1,
    },
  );

  if (effectiveScu <= 0) return null;

  const travelTime = estimateTravelTime(candidate.buy, candidate.sell, {
    cargoScu: effectiveScu,
    crew: plannerInput.crew ?? 1,
    orbitDistances,
  });

  return {
    fromTerminalId: candidate.buy.terminalId,
    toTerminalId: candidate.sell.terminalId,
    commodityId: candidate.commodityId,
    commodity: candidate.commodity,
    commodityCode: candidate.commodityCode,
    buyOffer: candidate.buy,
    sellOffer: candidate.sell,
    legProfit: legProfitPerScu * effectiveScu,
    legProfitPerScu,
    effectiveScu,
    travelTime,
    isIllegal: candidate.isIllegal,
    isVolatileQt: candidate.isVolatileQt,
  };
}

export function buildTransitionGraph(
  market: TradeRouteMarketInput,
  plannerInput: LoopPlannerInput,
  orbitDistances: OrbitDistanceMap = {},
): TransitionGraph {
  const { candidates } = buildTradePairs(market, {
    excludeIllegal: plannerInput.excludeIllegal,
  });

  const nodes: Record<number, TerminalSnapshot> = {};
  const edges: TransitionEdge[] = [];

  for (const candidate of candidates) {
    const edge = candidateToEdge(candidate, plannerInput, orbitDistances);
    if (!edge) continue;

    addNode(nodes, edge.buyOffer);
    addNode(nodes, edge.sellOffer);
    edges.push(edge);
  }

  return filterGraphBySystems({ nodes, edges }, plannerInput);
}

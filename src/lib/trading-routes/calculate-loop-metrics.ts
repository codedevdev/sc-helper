import { computeScuUsed } from "@/lib/trading-routes/calculate-metrics";
import {
  estimateTravelTime,
  lookupOrbitDistanceGm,
} from "@/lib/trading-routes/estimate-travel-time";
import { getShipByName } from "@/lib/trading-routes/ships";
import type { OrbitDistanceMap, TradeRouteSearchParams } from "@/lib/trading-routes/types";
import type {
  LoopLeg,
  RouteTimeEstimate,
  TradingLoopCandidate,
  TradingLoopRoute,
} from "@/types/trading-route";

function emptyTimeEstimate(): RouteTimeEstimate {
  return { qt: 0, load: 0, unload: 0, overhead: 0, total: 0 };
}

function addTimeEstimates(a: RouteTimeEstimate, b: RouteTimeEstimate): RouteTimeEstimate {
  return {
    qt: a.qt + b.qt,
    load: a.load + b.load,
    unload: a.unload + b.unload,
    overhead: a.overhead + b.overhead,
    total: a.total + b.total,
  };
}

function buildLegTravelOptions(
  params: TradeRouteSearchParams,
  scuUsed: number,
  orbitDistances: OrbitDistanceMap,
  leg: LoopLeg,
): Parameters<typeof estimateTravelTime>[2] {
  const ship = params.shipName ? getShipByName(params.shipName) : undefined;
  const distanceGm = lookupOrbitDistanceGm(
    orbitDistances,
    leg.buy.orbitId,
    leg.sell.orbitId,
  );
  return {
    cargoScu: scuUsed,
    crew: params.crew,
    distanceGm,
    orbitDistances,
    ship: ship
      ? { name: ship.name, scu: ship.scu, quantumSpeedClass: ship.quantumSpeedClass }
      : params.shipScu != null
        ? { scu: params.shipScu }
        : undefined,
  };
}

export interface LoopRouteMetrics {
  grossProfit: number;
  totalCost: number;
  roi: number;
  effectiveScu: number;
  profitPerScu: number;
  distanceGm: number;
  time: RouteTimeEstimate;
  legTimes: RouteTimeEstimate[];
}

export function calculateLoopRouteMetrics(
  candidate: TradingLoopCandidate,
  params: TradeRouteSearchParams,
  orbitDistances: OrbitDistanceMap = {},
): LoopRouteMetrics | null {
  if (candidate.legs.length < 1) return null;

  const hasIllegal = candidate.legs.some((l) => l.isIllegal);
  if (params.excludeIllegal && hasIllegal) return null;

  if (params.requireCargoCenter) {
    for (const leg of candidate.legs) {
      if (!leg.buy.hasCargoCenter || !leg.sell.hasCargoCenter) return null;
    }
  }

  let capital = params.budgetAuec;
  let totalGrossProfit = 0;
  let totalBuyCost = 0;
  let totalDistanceGm = 0;
  let minScu = Number.POSITIVE_INFINITY;
  let totalSpreadPerScu = 0;
  let time = emptyTimeEstimate();
  const legTimes: RouteTimeEstimate[] = [];

  for (const leg of candidate.legs) {
    const profitPerScu = leg.sell.price - leg.buy.price;
    if (profitPerScu <= 0) return null;

    const legBudget = capital > 0 ? capital : params.budgetAuec;
    const scuUsed = computeScuUsed(leg.buy.price, leg.buy.scu, leg.sell.scu, {
      ...params,
      budgetAuec: legBudget,
    });
    if (scuUsed <= 0) return null;

    const buyCost = leg.buy.price * scuUsed;
    const grossProfit = profitPerScu * scuUsed;
    const legTime = estimateTravelTime(
      leg.buy,
      leg.sell,
      buildLegTravelOptions(params, scuUsed, orbitDistances, leg),
    );
    const legDistance = lookupOrbitDistanceGm(
      orbitDistances,
      leg.buy.orbitId,
      leg.sell.orbitId,
    );

    totalGrossProfit += grossProfit;
    totalBuyCost += buyCost;
    totalDistanceGm += legDistance;
    minScu = Math.min(minScu, scuUsed);
    totalSpreadPerScu += profitPerScu;
    time = addTimeEstimates(time, legTime);
    legTimes.push(legTime);

    if (capital > 0) {
      capital = capital - buyCost + leg.sell.price * scuUsed;
    }
  }

  const operatingCost = params.operatingCostAuec ?? 0;
  const netGross = totalGrossProfit - operatingCost;
  if (netGross <= 0 && operatingCost > 0) return null;

  const roi = totalBuyCost > 0 ? totalGrossProfit / totalBuyCost : 0;
  const avgProfitPerScu = totalSpreadPerScu / candidate.legs.length;

  return {
    grossProfit: totalGrossProfit,
    totalCost: totalBuyCost,
    roi,
    effectiveScu: minScu,
    profitPerScu: avgProfitPerScu,
    distanceGm: totalDistanceGm,
    time,
    legTimes,
  };
}

export function candidateToTradingLoopRoute(
  candidate: TradingLoopCandidate,
  params: TradeRouteSearchParams,
  orbitDistances: OrbitDistanceMap = {},
): TradingLoopRoute | null {
  const metrics = calculateLoopRouteMetrics(candidate, params, orbitDistances);
  if (!metrics) return null;

  const profitPerMin = metrics.time.total > 0 ? metrics.grossProfit / metrics.time.total : 0;
  const isIllegal = candidate.legs.some((l) => l.isIllegal);
  const isVolatileQt = candidate.legs.some((l) => l.isVolatileQt);

  return {
    ...candidate,
    grossProfit: metrics.grossProfit,
    totalCost: metrics.totalCost,
    roiPercent: metrics.roi * 100,
    profitPerMin,
    profitPerScu: metrics.profitPerScu,
    effectiveScu: metrics.effectiveScu,
    distanceGm: metrics.distanceGm,
    time: metrics.time,
    legTimes: metrics.legTimes,
    isIllegal,
    isVolatileQt,
  };
}

export function applySearchParamsToLoopCandidates(
  candidates: TradingLoopCandidate[],
  params: TradeRouteSearchParams,
  orbitDistances: OrbitDistanceMap = {},
): TradingLoopRoute[] {
  const routes: TradingLoopRoute[] = [];
  for (const candidate of candidates) {
    const route = candidateToTradingLoopRoute(candidate, params, orbitDistances);
    if (route) routes.push(route);
  }
  return routes;
}

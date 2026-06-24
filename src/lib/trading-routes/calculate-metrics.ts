import {
  estimateTravelTime,
  lookupOrbitDistanceGm,
} from "@/lib/trading-routes/estimate-travel-time";
import { getShipByName } from "@/lib/trading-routes/ships";
import type {
  OrbitDistanceMap,
  RouteMetrics,
  ScoredTradeRoute,
  TradeRouteSearchParams,
} from "@/lib/trading-routes/types";
import type { TradingRoute, TradingRouteCandidate } from "@/types/trading-route";

function buildTravelTimeOptions(
  params: TradeRouteSearchParams,
  scuUsed: number,
  orbitDistances: OrbitDistanceMap,
  candidate: TradingRouteCandidate,
): Parameters<typeof estimateTravelTime>[2] {
  const ship = params.shipName ? getShipByName(params.shipName) : undefined;
  const distanceGm = lookupOrbitDistanceGm(
    orbitDistances,
    candidate.buy.orbitId,
    candidate.sell.orbitId,
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

export function computeScuUsed(
  buyPrice: number,
  buyScu: number,
  sellScu: number,
  params: TradeRouteSearchParams,
): number {
  const cargoScu = params.cargoScu;
  const budgetAuec = params.budgetAuec;
  const hasBudget = budgetAuec > 0;
  const maxByBudget = hasBudget ? Math.floor(budgetAuec / buyPrice) : cargoScu;
  const maxByStock = Math.min(
    buyScu > 0 ? buyScu : Number.POSITIVE_INFINITY,
    sellScu > 0 ? sellScu : Number.POSITIVE_INFINITY,
  );
  return Math.max(0, Math.min(cargoScu, maxByBudget, maxByStock));
}

/** @deprecated Use computeScuUsed — kept for uex adapter compatibility. */
export const computeEffectiveScu = (
  buyPrice: number,
  buyScu: number,
  sellScu: number,
  cargoScu: number,
  budgetAuec: number,
): number =>
  computeScuUsed(buyPrice, buyScu, sellScu, { cargoScu, budgetAuec, crew: 1 });

export function calculateRouteMetrics(
  candidate: TradingRouteCandidate,
  params: TradeRouteSearchParams,
  orbitDistances: OrbitDistanceMap = {},
): RouteMetrics | null {
  const buyPrice = candidate.buy.price;
  const sellPrice = candidate.sell.price;
  const profitPerScu = sellPrice - buyPrice;
  if (profitPerScu <= 0) return null;

  if (params.excludeIllegal && candidate.isIllegal) return null;
  if (params.requireCargoCenter && (!candidate.buy.hasCargoCenter || !candidate.sell.hasCargoCenter)) {
    return null;
  }

  const scuUsed = computeScuUsed(
    buyPrice,
    candidate.buy.scu,
    candidate.sell.scu,
    params,
  );
  if (scuUsed <= 0) return null;

  const buyCost = buyPrice * scuUsed;
  const sellRevenue = sellPrice * scuUsed;
  const grossProfit = profitPerScu * scuUsed;
  const operatingCost = params.operatingCostAuec ?? 0;
  const netProfit = grossProfit - operatingCost;
  const roi = buyCost > 0 ? grossProfit / buyCost : 0;

  const time = estimateTravelTime(
    candidate.buy,
    candidate.sell,
    buildTravelTimeOptions(params, scuUsed, orbitDistances, candidate),
  );

  return {
    buyCost,
    sellRevenue,
    grossProfit,
    netProfit,
    roi,
    scuUsed,
    profitPerScu,
    estimatedMinutes: time.total,
  };
}

export function candidateToScoredRoute(
  candidate: TradingRouteCandidate,
  params: TradeRouteSearchParams,
  orbitDistances: OrbitDistanceMap = {},
): ScoredTradeRoute | null {
  const metrics = calculateRouteMetrics(candidate, params, orbitDistances);
  if (!metrics) return null;
  return { ...candidate, metrics };
}

/** Builds full TradingRoute for existing UI hooks. */
export function candidateToTradingRoute(
  candidate: TradingRouteCandidate,
  params: TradeRouteSearchParams,
  orbitDistances: OrbitDistanceMap = {},
): TradingRoute | null {
  const metrics = calculateRouteMetrics(candidate, params, orbitDistances);
  if (!metrics) return null;

  const distanceGm = lookupOrbitDistanceGm(
    orbitDistances,
    candidate.buy.orbitId,
    candidate.sell.orbitId,
  );
  const time = estimateTravelTime(
    candidate.buy,
    candidate.sell,
    buildTravelTimeOptions(params, metrics.scuUsed, orbitDistances, candidate),
  );
  const profitPerMin =
    time.total > 0 ? metrics.grossProfit / time.total : 0;

  return {
    ...candidate,
    profitPerScu: metrics.profitPerScu,
    effectiveScu: metrics.scuUsed,
    grossProfit: metrics.grossProfit,
    totalCost: metrics.buyCost,
    roiPercent: metrics.roi * 100,
    profitPerMin,
    distanceGm,
    time,
  };
}

export function applySearchParamsToCandidates(
  candidates: TradingRouteCandidate[],
  params: TradeRouteSearchParams,
  orbitDistances: OrbitDistanceMap = {},
): TradingRoute[] {
  const routes: TradingRoute[] = [];
  for (const candidate of candidates) {
    const route = candidateToTradingRoute(candidate, params, orbitDistances);
    if (route) routes.push(route);
  }
  return routes;
}

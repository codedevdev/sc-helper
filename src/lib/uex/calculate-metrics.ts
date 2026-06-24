import {
  applySearchParamsToCandidates,
  candidateToTradingRoute as scoreCandidateToTradingRoute,
  computeEffectiveScu,
  computeScuUsed,
} from "@/lib/trading-routes/calculate-metrics";
import { plannerToSearchParams } from "@/lib/trading-routes/types";
import type { OrbitDistanceMap } from "@/lib/uex/types";
import type {
  TradingRoute,
  TradingRouteCandidate,
  TradingRoutePlannerInput,
} from "@/types/trading-route";

export { computeEffectiveScu, computeScuUsed };

export function candidateToTradingRoute(
  candidate: TradingRouteCandidate,
  input: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName?: string,
): TradingRoute | null {
  return scoreCandidateToTradingRoute(
    candidate,
    plannerToSearchParams(input, shipName),
    orbitDistances,
  );
}

export function applyPlannerToCandidates(
  candidates: TradingRouteCandidate[],
  input: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName?: string,
): TradingRoute[] {
  return applySearchParamsToCandidates(
    candidates,
    plannerToSearchParams(input, shipName),
    orbitDistances,
  );
}

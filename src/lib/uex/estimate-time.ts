import {
  estimateTravelTime,
  lookupOrbitDistanceGm,
  orbitDistanceKey,
} from "@/lib/trading-routes/estimate-travel-time";
import type { RouteTimeEstimate, TradingRouteCandidate } from "@/types/trading-route";

export type { RouteTimeEstimate };
export { lookupOrbitDistanceGm, orbitDistanceKey };

export function estimateTime(
  route: TradingRouteCandidate,
  distanceGm: number,
  cargoScu: number,
  crew = 1,
): RouteTimeEstimate {
  return estimateTravelTime(route.buy, route.sell, {
    cargoScu,
    crew,
    distanceGm,
  });
}

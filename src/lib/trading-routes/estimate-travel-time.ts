import {
  DEFAULT_MAX_CONTAINER_SIZE,
  HEURISTIC_CROSS_SYSTEM_GM,
  HEURISTIC_SAME_SYSTEM_GM,
  QT_FALLBACK_CROSS_SYSTEM_MIN,
  QT_FALLBACK_SAME_ORBIT_MIN,
  QT_FALLBACK_SAME_SYSTEM_MIN,
  ROUTE_OVERHEAD_MINUTES,
  SYSTEM_PAIR_GM,
  UNLOAD_MINUTES,
} from "@/lib/trading-routes/constants";
import { getQuantumSpeedGmPerSec } from "@/lib/trading-routes/ships";
import type { QuantumSpeedClass } from "@/lib/trading-routes/ships";
import type { OrbitDistanceMap, TravelTimeLeg, TravelTimeOptions } from "@/lib/trading-routes/types";
import type { RouteTimeEstimate } from "@/types/trading-route";

export function orbitDistanceKey(originOrbitId: number, destOrbitId: number): string {
  return `${originOrbitId}-${destOrbitId}`;
}

export function lookupOrbitDistanceGm(
  map: Record<string, number>,
  buyOrbitId: number,
  sellOrbitId: number,
): number {
  return map[orbitDistanceKey(buyOrbitId, sellOrbitId)] ?? 0;
}

function systemPairKey(originSystemId: number, destSystemId: number): string {
  return `${originSystemId}-${destSystemId}`;
}

export function resolveDistanceGm(
  buyLeg: TravelTimeLeg,
  sellLeg: TravelTimeLeg,
  orbitDistances: OrbitDistanceMap = {},
  apiDistanceGm = 0,
): number {
  if (apiDistanceGm > 0) return apiDistanceGm;

  const fromMap = lookupOrbitDistanceGm(orbitDistances, buyLeg.orbitId, sellLeg.orbitId);
  if (fromMap > 0) return fromMap;

  if (buyLeg.orbitId === sellLeg.orbitId && buyLeg.orbitId > 0) {
    return 0;
  }

  if (buyLeg.systemId === sellLeg.systemId && buyLeg.systemId > 0) {
    return HEURISTIC_SAME_SYSTEM_GM;
  }

  const pairKey = systemPairKey(buyLeg.systemId, sellLeg.systemId);
  return SYSTEM_PAIR_GM[pairKey] ?? HEURISTIC_CROSS_SYSTEM_GM;
}

function cargoLoadMinutes(
  scu: number,
  hasCargoCenter: boolean,
  hasLoadingDock: boolean,
  hasFreightElevator: boolean,
  maxContainerSize: number,
): number {
  const maxCs = maxContainerSize > 0 ? maxContainerSize : DEFAULT_MAX_CONTAINER_SIZE;
  const numBatches = Math.ceil(scu / maxCs);
  let secondsPerContainer: number;
  let firstMinute: number;

  if (hasCargoCenter) {
    secondsPerContainer = 8;
    firstMinute = 1;
  } else if (hasLoadingDock) {
    secondsPerContainer = 45;
    firstMinute = 1.5;
  } else if (hasFreightElevator) {
    secondsPerContainer = 100;
    firstMinute = 2;
  } else {
    secondsPerContainer = 120;
    firstMinute = 2;
  }

  return firstMinute + (numBatches * secondsPerContainer) / 60;
}

function resolveQtMinutes(
  buy: TravelTimeLeg,
  sell: TravelTimeLeg,
  distanceGm: number,
  quantumSpeedClass: QuantumSpeedClass = "standard",
): number {
  const qtSpeed = getQuantumSpeedGmPerSec(quantumSpeedClass);

  if (distanceGm > 0) {
    return distanceGm / qtSpeed / 60;
  }

  if (buy.orbitId === sell.orbitId && buy.orbitId > 0) {
    return QT_FALLBACK_SAME_ORBIT_MIN;
  }

  if (buy.systemId === sell.systemId && buy.systemId > 0) {
    return QT_FALLBACK_SAME_SYSTEM_MIN;
  }

  return QT_FALLBACK_CROSS_SYSTEM_MIN;
}

function resolveUnloadMinutes(
  scu: number,
  sellLeg: TravelTimeLeg,
  crew: number,
): number {
  const raw = cargoLoadMinutes(
    scu,
    sellLeg.hasCargoCenter,
    sellLeg.hasLoadingDock,
    sellLeg.hasFreightElevator,
    sellLeg.maxContainerSize,
  );
  const scaled = raw * 0.5;
  const withCrew = sellLeg.hasCargoCenter ? scaled : scaled / Math.max(crew, 1);
  return Math.max(UNLOAD_MINUTES, Math.round(withCrew));
}

export function estimateTravelTime(
  buyLeg: TravelTimeLeg,
  sellLeg: TravelTimeLeg,
  options: TravelTimeOptions,
): RouteTimeEstimate {
  const cargoScu = options.cargoScu;
  const crew = options.crew ?? 1;
  const quantumSpeedClass = options.ship?.quantumSpeedClass ?? "standard";

  const distanceGm = resolveDistanceGm(
    buyLeg,
    sellLeg,
    options.orbitDistances,
    options.distanceGm ?? 0,
  );

  const qtMinutes = resolveQtMinutes(buyLeg, sellLeg, distanceGm, quantumSpeedClass);
  const loadRaw = cargoLoadMinutes(
    cargoScu,
    buyLeg.hasCargoCenter,
    buyLeg.hasLoadingDock,
    buyLeg.hasFreightElevator,
    buyLeg.maxContainerSize,
  );
  const loadMin = buyLeg.hasCargoCenter ? loadRaw : loadRaw / Math.max(crew, 1);
  const unloadMin = resolveUnloadMinutes(cargoScu, sellLeg, crew);

  return {
    qt: Math.round(qtMinutes),
    load: Math.round(loadMin),
    unload: unloadMin,
    overhead: ROUTE_OVERHEAD_MINUTES,
    total: Math.round(qtMinutes + loadMin + unloadMin + ROUTE_OVERHEAD_MINUTES),
  };
}

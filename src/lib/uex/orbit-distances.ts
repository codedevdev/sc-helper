import { orbitDistanceKey } from "@/lib/uex/estimate-time";
import { fetchOrbitDistancesForSystems } from "@/lib/uex/endpoints";
import type { OrbitDistanceMap } from "@/lib/uex/types";

function parseDistanceGm(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchOrbitDistances(systemIds: number[]): Promise<OrbitDistanceMap> {
  const unique = [...new Set(systemIds.filter((id) => id > 0))];
  const distMap: OrbitDistanceMap = {};
  const pairs = new Set<string>();

  for (const sysOrigin of unique) {
    for (const sysDest of unique) {
      const pairKey = `${sysOrigin}-${sysDest}`;
      if (pairs.has(pairKey)) continue;
      pairs.add(pairKey);

      try {
        const data = await fetchOrbitDistancesForSystems(sysOrigin, sysDest);
        for (const d of data) {
          const gm = parseDistanceGm(d.distance);
          distMap[orbitDistanceKey(d.id_orbit_origin, d.id_orbit_destination)] = gm;
          distMap[orbitDistanceKey(d.id_orbit_destination, d.id_orbit_origin)] = gm;
        }
      } catch (e) {
        console.warn("[UEX] orbits_distances failed:", sysOrigin, sysDest, e);
      }
    }
  }

  return distMap;
}

export function collectSystemIdsFromCandidates(
  candidates: { buy: { systemId: number }; sell: { systemId: number } }[],
): number[] {
  const ids = new Set<number>();
  for (const r of candidates) {
    if (r.buy.systemId > 0) ids.add(r.buy.systemId);
    if (r.sell.systemId > 0) ids.add(r.sell.systemId);
  }
  return [...ids];
}

export function collectSystemIdsFromLoopCandidates(
  candidates: { legs: { buy: { systemId: number }; sell: { systemId: number } }[] }[],
): number[] {
  const ids = new Set<number>();
  for (const loop of candidates) {
    for (const leg of loop.legs) {
      if (leg.buy.systemId > 0) ids.add(leg.buy.systemId);
      if (leg.sell.systemId > 0) ids.add(leg.sell.systemId);
    }
  }
  return [...ids];
}

export function collectSystemIdsFromGraph(
  nodes: Record<number, { systemId: number }>,
): number[] {
  const ids = new Set<number>();
  for (const node of Object.values(nodes)) {
    if (node.systemId > 0) ids.add(node.systemId);
  }
  return [...ids];
}

import { QT_SPEED_GM_PER_SEC } from "@/lib/trading-routes/constants";

export type QuantumSpeedClass = "starter" | "standard" | "fast" | "hauler";

export interface TradingShip {
  name: string;
  scu: number;
  quantumSpeedClass: QuantumSpeedClass;
  uexSlug?: string;
}

const QT_SPEED_MULTIPLIER: Record<QuantumSpeedClass, number> = {
  starter: 0.055 / QT_SPEED_GM_PER_SEC,
  standard: 1,
  fast: 0.07 / QT_SPEED_GM_PER_SEC,
  hauler: 0.055 / QT_SPEED_GM_PER_SEC,
};

export const TRADING_SHIPS: TradingShip[] = [
  { name: "Aurora CL", scu: 6, quantumSpeedClass: "starter", uexSlug: "aurora-cl" },
  { name: "Avenger Titan", scu: 12, quantumSpeedClass: "starter", uexSlug: "avenger-titan" },
  { name: "Nomad", scu: 24, quantumSpeedClass: "starter", uexSlug: "nomad" },
  { name: "Cutlass Black", scu: 46, quantumSpeedClass: "standard", uexSlug: "cutlass-black" },
  { name: "Freelancer", scu: 66, quantumSpeedClass: "standard", uexSlug: "freelancer" },
  { name: "Freelancer MAX", scu: 120, quantumSpeedClass: "standard", uexSlug: "freelancer-max" },
  { name: "Constellation Taurus", scu: 174, quantumSpeedClass: "hauler", uexSlug: "constellation-taurus" },
  { name: "Constellation Andromeda", scu: 96, quantumSpeedClass: "standard", uexSlug: "constellation-andromeda" },
  { name: "Hull A", scu: 64, quantumSpeedClass: "fast", uexSlug: "hull-a" },
  { name: "Hull B", scu: 384, quantumSpeedClass: "hauler", uexSlug: "hull-b" },
  { name: "Hull C", scu: 4608, quantumSpeedClass: "hauler", uexSlug: "hull-c" },
  { name: "Caterpillar", scu: 576, quantumSpeedClass: "hauler", uexSlug: "caterpillar" },
  { name: "C2 Hercules", scu: 696, quantumSpeedClass: "hauler", uexSlug: "c2-hercules" },
  { name: "M2 Hercules", scu: 522, quantumSpeedClass: "hauler", uexSlug: "m2-hercules" },
  { name: "RAFT", scu: 96, quantumSpeedClass: "standard", uexSlug: "raft" },
  { name: "Mercury Star Runner", scu: 114, quantumSpeedClass: "fast", uexSlug: "mercury-star-runner" },
];

const STATIC_BY_SLUG = new Map(
  TRADING_SHIPS.map((s) => [s.uexSlug ?? s.name.toLowerCase().replace(/\s+/g, "-"), s]),
);
const STATIC_BY_NAME = new Map(TRADING_SHIPS.map((s) => [s.name.toLowerCase(), s]));

const QUANTUM_SPEED_CLASS_LABELS: Record<QuantumSpeedClass, string> = {
  starter: "Starter",
  standard: "Standard",
  fast: "Fast",
  hauler: "Hauler",
};

export function inferQuantumSpeedClass(name: string, scu: number): QuantumSpeedClass {
  const lower = name.toLowerCase();
  if (/mercury|hull\s*a\b/.test(lower)) return "fast";
  if (/hull|hercules|caterpillar|\braft\b|c2\b|m2\b|taurus|starlifter|galaxy|merchantman|nomad/i.test(lower)) {
    if (/hull\s*a\b|mercury/.test(lower)) return "fast";
    if (/hull|hercules|caterpillar|taurus|starlifter|galaxy|merchantman|c2|m2/.test(lower)) return "hauler";
  }
  if (scu <= 24) return "starter";
  return "standard";
}

function matchStaticShip(name: string, slug?: string): TradingShip | undefined {
  if (slug) {
    const bySlug = STATIC_BY_SLUG.get(slug);
    if (bySlug) return bySlug;
  }
  return STATIC_BY_NAME.get(name.toLowerCase());
}

export function buildFullShipListFromUex(
  vehicles: { name: string; slug?: string; scu: number }[],
): TradingShip[] {
  const byKey = new Map<string, TradingShip>();

  for (const v of vehicles) {
    const scu = Math.round(v.scu);
    if (scu <= 0) continue;
    const key = (v.slug ?? v.name.toLowerCase().replace(/\s+/g, "-")).toLowerCase();
    if (byKey.has(key)) continue;

    const staticMatch = matchStaticShip(v.name, v.slug);
    if (staticMatch) {
      byKey.set(key, {
        ...staticMatch,
        name: v.name,
        scu,
        uexSlug: v.slug ?? staticMatch.uexSlug,
      });
    } else {
      byKey.set(key, {
        name: v.name,
        scu,
        quantumSpeedClass: inferQuantumSpeedClass(v.name, scu),
        uexSlug: v.slug,
      });
    }
  }

  const ships = [...byKey.values()].sort((a, b) => a.scu - b.scu || a.name.localeCompare(b.name));
  return ships.length > 0 ? ships : [...TRADING_SHIPS];
}

export function getShipByName(name: string): TradingShip | undefined {
  const list = getTradingShipsList();
  return list.find((s) => s.name === name);
}

export function getQuantumSpeedGmPerSec(speedClass: QuantumSpeedClass = "standard"): number {
  return QT_SPEED_GM_PER_SEC * QT_SPEED_MULTIPLIER[speedClass];
}

export function getQuantumSpeedClassLabel(speedClass: QuantumSpeedClass): string {
  return QUANTUM_SPEED_CLASS_LABELS[speedClass];
}

export function resolveShipForTravelTime(shipName?: string): TradingShip["quantumSpeedClass"] | undefined {
  if (!shipName) return undefined;
  return getShipByName(shipName)?.quantumSpeedClass;
}

const SHIPS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
let mergedShipsCache: { ships: TradingShip[]; fetchedAt: number } | null = null;
let mergeInflight: Promise<TradingShip[]> | null = null;

export async function fetchCargoShipsFromUex(
  fetchVehicles: () => Promise<{ name: string; slug?: string; scu: number }[]>,
): Promise<TradingShip[]> {
  if (mergedShipsCache && Date.now() - mergedShipsCache.fetchedAt < SHIPS_CACHE_TTL_MS) {
    return mergedShipsCache.ships;
  }
  if (mergeInflight) return mergeInflight;

  mergeInflight = (async () => {
    try {
      const vehicles = await fetchVehicles();
      const ships = buildFullShipListFromUex(vehicles);
      mergedShipsCache = { ships, fetchedAt: Date.now() };
      return ships;
    } catch {
      return TRADING_SHIPS;
    } finally {
      mergeInflight = null;
    }
  })();

  return mergeInflight;
}

export function getTradingShipsList(): TradingShip[] {
  return mergedShipsCache?.ships ?? TRADING_SHIPS;
}

export function clearTradingShipsCache(): void {
  mergedShipsCache = null;
  mergeInflight = null;
}

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

const SHIPS_BY_NAME = new Map(TRADING_SHIPS.map((s) => [s.name, s]));

const QUANTUM_SPEED_CLASS_LABELS: Record<QuantumSpeedClass, string> = {
  starter: "Starter",
  standard: "Standard",
  fast: "Fast",
  hauler: "Hauler",
};

export function getShipByName(name: string): TradingShip | undefined {
  return SHIPS_BY_NAME.get(name);
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

function mergeUexScuIntoStatic(uexNames: Map<string, number>): TradingShip[] {
  return TRADING_SHIPS.map((ship) => {
    const slug = ship.uexSlug ?? ship.name.toLowerCase().replace(/\s+/g, "-");
    const uexScu = uexNames.get(slug) ?? uexNames.get(ship.name.toLowerCase());
    return uexScu != null && uexScu > 0 ? { ...ship, scu: Math.round(uexScu) } : ship;
  });
}

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
      const uexNames = new Map<string, number>();
      for (const v of vehicles) {
        const scu = Math.round(v.scu);
        if (scu <= 0) continue;
        if (v.slug) uexNames.set(v.slug, scu);
        uexNames.set(v.name.toLowerCase(), scu);
      }
      const ships = mergeUexScuIntoStatic(uexNames);
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

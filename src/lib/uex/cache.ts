import { isTauri } from "@tauri-apps/api/core";
import {
  clearUexPriceSnapshots,
  loadUexPriceSnapshot,
  saveUexPriceSnapshot,
} from "@/db/uex-snapshots";
import { getSettings } from "@/db/settings";
import { fetchMarketDataBundle } from "@/lib/uex/endpoints";
import type { OrbitDistanceMap, UexMarketData } from "@/lib/uex/types";
import { DEFAULT_UEX_CACHE_TTL_MINUTES } from "@/types/settings";

export const UEX_MARKET_TTL_MS = 10 * 60 * 1000;
const DISTANCES_TTL_MS = 24 * 60 * 60 * 1000;
const BROWSER_TTL_KEY = "sc-trader.uex-cache-ttl-minutes";

let marketTtlMs = UEX_MARKET_TTL_MS;
let fromSnapshot = false;
let snapshotFallbackMessage: string | null = null;

interface TimedEntry<T> {
  data: T;
  fetchedAt: number;
}

interface CacheState {
  data: UexMarketData | null;
  fetchedAt: number;
  inflight: Promise<UexMarketData> | null;
}

const marketCache: CacheState = {
  data: null,
  fetchedAt: 0,
  inflight: null,
};

let distancesCache: TimedEntry<OrbitDistanceMap> | null = null;

type MarketListener = (data: UexMarketData | null) => void;
const listeners = new Set<MarketListener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener(marketCache.data);
  }
}

function isFresh(fetchedAt: number, ttlMs: number): boolean {
  return fetchedAt > 0 && Date.now() - fetchedAt < ttlMs;
}

function readBrowserTtlMinutes(): number {
  try {
    const raw = localStorage.getItem(BROWSER_TTL_KEY);
    if (!raw) return DEFAULT_UEX_CACHE_TTL_MINUTES;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 && n <= 1440 ? n : DEFAULT_UEX_CACHE_TTL_MINUTES;
  } catch {
    return DEFAULT_UEX_CACHE_TTL_MINUTES;
  }
}

export function getUexMarketTtlMs(): number {
  return marketTtlMs;
}

export function setUexMarketTtlMs(ms: number): void {
  marketTtlMs = Math.max(60_000, ms);
}

export function isUsingSnapshotFallback(): boolean {
  return fromSnapshot;
}

export function getSnapshotFallbackMessage(): string | null {
  return snapshotFallbackMessage;
}

export async function initUexCacheFromSettings(): Promise<void> {
  try {
    if (isTauri()) {
      const settings = await getSettings();
      setUexMarketTtlMs(settings.uexCacheTtlMinutes * 60 * 1000);
    } else {
      setUexMarketTtlMs(readBrowserTtlMinutes() * 60 * 1000);
    }
  } catch {
    setUexMarketTtlMs(UEX_MARKET_TTL_MS);
  }
}

export function persistBrowserUexTtlMinutes(minutes: number): void {
  localStorage.setItem(BROWSER_TTL_KEY, String(Math.min(1440, Math.max(1, Math.round(minutes)))));
  setUexMarketTtlMs(minutes * 60 * 1000);
}

export function subscribeMarketData(listener: MarketListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedMarketData(): UexMarketData | null {
  return marketCache.data;
}

export function isMarketDataStale(): boolean {
  if (!marketCache.data) return true;
  return !isFresh(marketCache.fetchedAt, marketTtlMs);
}

export interface GetMarketDataOptions {
  force?: boolean;
  staleOk?: boolean;
}

async function loadSnapshotIntoMemory(): Promise<UexMarketData | null> {
  const snapshot = await loadUexPriceSnapshot();
  if (!snapshot) return null;

  marketCache.data = snapshot;
  marketCache.fetchedAt = new Date(snapshot.fetchedAt).getTime() || Date.now();
  fromSnapshot = true;
  snapshotFallbackMessage = `Using cached prices from ${new Date(snapshot.fetchedAt).toLocaleString()}. Live UEX data is unavailable.`;
  notifyListeners();
  return snapshot;
}

async function fetchAndStore(): Promise<UexMarketData> {
  const data = await fetchMarketDataBundle();
  marketCache.data = data;
  marketCache.fetchedAt = Date.now();
  fromSnapshot = false;
  snapshotFallbackMessage = null;
  notifyListeners();
  void saveUexPriceSnapshot(data).catch((err) => {
    console.warn("[UEX] failed to persist snapshot:", err);
  });
  return data;
}

function scheduleBackgroundRefetch(): void {
  if (marketCache.inflight) return;
  marketCache.inflight = fetchAndStore()
    .catch(async (err) => {
      console.warn("[UEX] background refetch failed:", err);
      if (marketCache.data) return marketCache.data;
      const snapshot = await loadSnapshotIntoMemory();
      if (snapshot) return snapshot;
      throw err;
    })
    .finally(() => {
      marketCache.inflight = null;
    });
}

export async function getMarketData(options: GetMarketDataOptions = {}): Promise<UexMarketData> {
  const { force = false, staleOk = false } = options;

  if (!force && marketCache.data && isFresh(marketCache.fetchedAt, marketTtlMs)) {
    return marketCache.data;
  }

  if (!force && staleOk && marketCache.data) {
    scheduleBackgroundRefetch();
    return marketCache.data;
  }

  if (marketCache.inflight) {
    return marketCache.inflight;
  }

  marketCache.inflight = fetchAndStore()
    .catch(async (err) => {
      console.warn("[UEX] fetch failed:", err);
      if (marketCache.data && isFresh(marketCache.fetchedAt, marketTtlMs * 24)) {
        fromSnapshot = false;
        snapshotFallbackMessage =
          err instanceof Error ? err.message : "Failed to refresh UEX data";
        return marketCache.data;
      }
      const snapshot = await loadSnapshotIntoMemory();
      if (snapshot) return snapshot;
      throw err;
    })
    .finally(() => {
      marketCache.inflight = null;
    });

  return marketCache.inflight;
}

/** @deprecated Use getMarketData */
export async function fetchMarketData(force = false): Promise<UexMarketData> {
  return getMarketData({ force, staleOk: !force });
}

export function getCachedOrbitDistances(): OrbitDistanceMap | null {
  if (distancesCache && isFresh(distancesCache.fetchedAt, DISTANCES_TTL_MS)) {
    return distancesCache.data;
  }
  return null;
}

export function setCachedOrbitDistances(map: OrbitDistanceMap): void {
  distancesCache = { data: map, fetchedAt: Date.now() };
}

export function mergeOrbitDistances(
  existing: OrbitDistanceMap,
  incoming: OrbitDistanceMap,
): OrbitDistanceMap {
  return { ...existing, ...incoming };
}

export async function clearUexCache(): Promise<void> {
  marketCache.data = null;
  marketCache.fetchedAt = 0;
  marketCache.inflight = null;
  distancesCache = null;
  fromSnapshot = false;
  snapshotFallbackMessage = null;
  await clearUexPriceSnapshots();
  notifyListeners();
}

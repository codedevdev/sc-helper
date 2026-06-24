import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getCachedMarketData,
  getMarketData,
  getSnapshotFallbackMessage,
  initUexCacheFromSettings,
  isMarketDataStale,
  isUsingSnapshotFallback,
  subscribeMarketData,
} from "@/lib/uex/cache";
import { loadAndInitUexConfig } from "@/lib/uex/config";
import type { UexConnectionStatus, UexMarketData } from "@/lib/uex/types";

export interface UexDataContextValue {
  status: UexConnectionStatus;
  error: string | null;
  data: UexMarketData | null;
  lastSync: string | null;
  isStale: boolean;
  isFromSnapshot: boolean;
  refetch: (force?: boolean) => Promise<void>;
}

const UexDataContext = createContext<UexDataContextValue | null>(null);

function logDevSmoke(data: UexMarketData): void {
  if (!import.meta.env.DEV) return;
  console.info("[UEX smoke]", {
    commodities: data.commodities.length,
    terminals: data.terminals.length,
    prices: data.prices.length,
    fetchedAt: data.fetchedAt,
  });
}

function deriveStatus(
  loading: boolean,
  error: string | null,
  data: UexMarketData | null,
  fromSnapshot: boolean,
): UexConnectionStatus {
  if (loading && !data) return "loading";
  if (fromSnapshot && data) return "stale";
  if (error && !data) return "offline";
  if (error && data) return "stale";
  if (data && isMarketDataStale()) return "stale";
  if (data) return "online";
  return "idle";
}

export function UexProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UexMarketData | null>(() => getCachedMarketData());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromSnapshot, setFromSnapshot] = useState(false);
  const smokeLogged = useRef(false);
  const initDone = useRef(false);

  const refetch = useCallback(async (force = false) => {
    setLoading(true);
    if (force) setError(null);

    try {
      const next = await getMarketData({ force, staleOk: !force });
      setData(next);
      setFromSnapshot(isUsingSnapshotFallback());
      const fallbackMsg = getSnapshotFallbackMessage();
      setError(fallbackMsg);
      if (!smokeLogged.current) {
        logDevSmoke(next);
        smokeLogged.current = true;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load UEX data";
      setError(message);
      setFromSnapshot(isUsingSnapshotFallback());
      console.warn("[UEX]", message, e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      if (!initDone.current) {
        await loadAndInitUexConfig();
        await initUexCacheFromSettings();
        initDone.current = true;
      }
      const cached = getCachedMarketData();
      if (cached) {
        setData(cached);
        setFromSnapshot(isUsingSnapshotFallback());
      }
      await refetch(false);
    })();

    return subscribeMarketData((next) => {
      if (next) {
        setData(next);
        setFromSnapshot(isUsingSnapshotFallback());
        const fallbackMsg = getSnapshotFallbackMessage();
        if (fallbackMsg) setError(fallbackMsg);
      }
    });
  }, [refetch]);

  const status = deriveStatus(loading, error, data, fromSnapshot);
  const isStale = status === "stale";

  const value = useMemo<UexDataContextValue>(
    () => ({
      status,
      error,
      data,
      lastSync: data?.fetchedAt ?? null,
      isStale,
      isFromSnapshot: fromSnapshot,
      refetch,
    }),
    [status, error, data, isStale, fromSnapshot, refetch],
  );

  return <UexDataContext.Provider value={value}>{children}</UexDataContext.Provider>;
}

export function useUexData(): UexDataContextValue {
  const ctx = useContext(UexDataContext);
  if (!ctx) {
    throw new Error("useUexData must be used within UexProvider");
  }
  return ctx;
}

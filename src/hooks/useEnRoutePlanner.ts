import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadPersistedEnRouteState,
  mergeEnRouteFilters,
  mergeEnRoutePlanner,
  schedulePersistedEnRouteState,
} from "@/features/trading-routes/default-en-route";
import { filterSortEnRouteResults } from "@/lib/trading-routes/search-en-route";
import { searchEnRoute } from "@/lib/trading-routes/search-en-route";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSettings } from "@/hooks/useSettings";
import { useUexData } from "@/hooks/useUexData";
import {
  getCachedOrbitDistances,
  mergeOrbitDistances,
  setCachedOrbitDistances,
} from "@/lib/uex/cache";
import { collectSystemIdsFromGraph, fetchOrbitDistances } from "@/lib/uex/orbit-distances";
import { buildTransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import type { OrbitDistanceMap } from "@/lib/uex/types";
import type { EnRouteFilters, EnRoutePlannerInput, EnRouteResult } from "@/types/trading-route";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export function useEnRoutePlanner() {
  const { settings } = useSettings();
  const settingsBaselineApplied = useRef(false);
  const persisted = useMemo(
    () => loadPersistedEnRouteState(settings?.tradingDefaults),
    [settings?.tradingDefaults],
  );

  const {
    data: marketData,
    status: uexStatus,
    error: uexError,
    isStale: uexIsStale,
    isFromSnapshot,
    refetch: refetchUex,
  } = useUexData();

  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<EnRouteResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMs, setSearchMs] = useState<number | null>(null);
  const [orbitDistances, setOrbitDistances] = useState<OrbitDistanceMap>(
    () => getCachedOrbitDistances() ?? {},
  );
  const [distancesReady, setDistancesReady] = useState(false);
  const [planner, setPlanner] = useState<EnRoutePlannerInput>(() =>
    mergeEnRoutePlanner(persisted.planner),
  );
  const [filters, setFilters] = useState<EnRouteFilters>(() =>
    mergeEnRouteFilters(persisted.filters),
  );

  const debouncedPlanner = useDebouncedValue(planner, 300);
  const debouncedFilters = useDebouncedValue(filters, 300);

  useEffect(() => {
    if (!settings || settingsBaselineApplied.current) return;
    settingsBaselineApplied.current = true;
    const merged = loadPersistedEnRouteState(settings.tradingDefaults);
    setPlanner(mergeEnRoutePlanner(merged.planner));
    setFilters(mergeEnRouteFilters(merged.filters));
  }, [settings]);

  useEffect(() => {
    schedulePersistedEnRouteState({ planner, filters });
  }, [planner, filters]);

  useEffect(() => {
    if (!marketData) {
      setDistancesReady(false);
      return;
    }

    const market = marketData;
    let cancelled = false;

    async function loadDistances() {
      try {
        const cached = getCachedOrbitDistances() ?? {};
        const graph = buildTransitionGraph(market, debouncedPlanner, cached);
        const systemIds = collectSystemIdsFromGraph(graph.nodes);
        if (systemIds.length === 0) {
          if (!cancelled) {
            setOrbitDistances(cached);
            setDistancesReady(true);
          }
          return;
        }
        const fetched = await fetchOrbitDistances(systemIds);
        if (cancelled) return;
        const merged = mergeOrbitDistances(cached, fetched);
        setCachedOrbitDistances(merged);
        setOrbitDistances(merged);
        setDistancesReady(true);
      } catch {
        if (!cancelled) {
          setOrbitDistances(getCachedOrbitDistances() ?? {});
          setDistancesReady(true);
        }
      }
    }

    void loadDistances();
    return () => {
      cancelled = true;
    };
  }, [marketData, debouncedPlanner]);

  useEffect(() => {
    if (!marketData || !distancesReady) return;
    if (!planner.originTerminalId || !planner.destinationTerminalId) {
      setAllResults([]);
      setStatus("ready");
      return;
    }

    const started = performance.now();
    setSearching(true);
    setError(uexError);

    try {
      const results = searchEnRoute(marketData, debouncedPlanner, orbitDistances);
      setAllResults(results);
      setSearchMs(Math.round(performance.now() - started));
      setStatus("ready");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to search en-route paths";
      setError(message);
      setStatus("error");
      setAllResults([]);
    } finally {
      setSearching(false);
    }
  }, [marketData, debouncedPlanner, orbitDistances, distancesReady, uexError]);

  const results = useMemo(
    () => filterSortEnRouteResults(allResults, debouncedFilters),
    [allResults, debouncedFilters],
  );

  const refresh = useCallback(
    async (force = false) => {
      setStatus("loading");
      setError(null);
      try {
        await refetchUex(force);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to refresh en-route data";
        setError(message);
        setStatus("error");
      }
    },
    [refetchUex],
  );

  const updatePlanner = useCallback((patch: Partial<EnRoutePlannerInput>) => {
    setPlanner((prev) => mergeEnRoutePlanner({ ...prev, ...patch }));
  }, []);

  const updateFilters = useCallback((patch: Partial<EnRouteFilters>) => {
    setFilters((prev) => mergeEnRouteFilters({ ...prev, ...patch }));
  }, []);

  const isLoading =
    (uexStatus === "loading" || uexStatus === "idle") && !marketData
      ? true
      : !distancesReady && Boolean(marketData);

  return {
    status: isLoading ? "loading" : status,
    error: error ?? uexError,
    uexIsStale,
    isFromSnapshot,
    planner,
    filters,
    results,
    allResults,
    updatePlanner,
    updateFilters,
    refresh,
    fetchedAt: marketData?.fetchedAt ?? null,
    searching,
    searchMs,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PLANNER_INPUT,
  DEFAULT_TRADING_ROUTE_FILTERS,
  loadPersistedTradingRoutesState,
  mergeLogProfitBasis,
  mergePlannerInput,
  mergeTradingRouteFilters,
  schedulePersistedTradingRoutesState,
} from "@/features/trading-routes/default-filters";
import { extractFilterOptions, filterTradingRoutes } from "@/features/trading-routes/filterRoutes";
import type { LogProfitBasis } from "@/lib/trading-routes/route-integration";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSettings } from "@/hooks/useSettings";
import { useUexData } from "@/hooks/useUexData";
import {
  getCachedOrbitDistances,
  mergeOrbitDistances,
  setCachedOrbitDistances,
} from "@/lib/uex/cache";
import { collectSystemIdsFromCandidates, fetchOrbitDistances } from "@/lib/uex/orbit-distances";
import {
  applyFilterPreset,
  detectMatchingPresetId,
  type FilterPresetId,
} from "@/lib/trading-routes/filter-presets";
import {
  buildRouteSnapshotFromMarket,
  scoreRouteCandidates,
  terminateTradingRoutesWorker,
} from "@/lib/trading-routes/worker-client";
import type { OrbitDistanceMap } from "@/lib/uex/types";
import type {
  SellAlternative,
  TradingRoute,
  TradingRouteFilters,
  TradingRoutePlannerInput,
  TradingRoutesSnapshot,
  TradingRoutesStats,
} from "@/types/trading-route";
import { MAX_DISPLAYED_ROUTES } from "@/types/trading-route";

type LoadStatus = "idle" | "loading" | "ready" | "error";

function computeStats(routes: TradingRoute[]): TradingRoutesStats {
  const count = routes.length;
  if (count === 0) {
    return { count: 0, bestProfit: null, bestRoi: null, commodityCount: 0 };
  }

  let bestProfit = routes[0].grossProfit;
  let bestRoi = routes[0].roiPercent;
  const commodities = new Set<string>();

  for (const r of routes) {
    if (r.grossProfit > bestProfit) bestProfit = r.grossProfit;
    if (r.roiPercent > bestRoi) bestRoi = r.roiPercent;
    commodities.add(r.commodity);
  }

  return {
    count,
    bestProfit,
    bestRoi,
    commodityCount: commodities.size,
  };
}

export function useTradingRoutes() {
  const { settings } = useSettings();
  const settingsBaselineApplied = useRef(false);
  const persisted = useMemo(
    () => loadPersistedTradingRoutesState(settings?.tradingDefaults),
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
  const [snapshot, setSnapshot] = useState<TradingRoutesSnapshot | null>(null);
  const [allRoutes, setAllRoutes] = useState<TradingRoute[]>([]);
  const [building, setBuilding] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [orbitDistances, setOrbitDistances] = useState<OrbitDistanceMap>(() => getCachedOrbitDistances() ?? {});
  const [distancesLoading, setDistancesLoading] = useState(false);
  const [planner, setPlanner] = useState<TradingRoutePlannerInput>(() =>
    mergePlannerInput(persisted.planner),
  );
  const [filters, setFilters] = useState<TradingRouteFilters>(() =>
    mergeTradingRouteFilters(persisted.filters),
  );
  const [shipName, setShipName] = useState(persisted.shipName ?? "");
  const [presetId, setPresetId] = useState<FilterPresetId | null>(persisted.presetId ?? null);
  const [logProfitBasis, setLogProfitBasis] = useState<LogProfitBasis>(() =>
    mergeLogProfitBasis(persisted.logProfitBasis),
  );

  const debouncedPlanner = useDebouncedValue(planner, 300);
  const debouncedFilters = useDebouncedValue(filters, 300);

  useEffect(() => {
    if (!settings || settingsBaselineApplied.current) return;
    settingsBaselineApplied.current = true;
    const merged = loadPersistedTradingRoutesState(settings.tradingDefaults);
    setPlanner(mergePlannerInput(merged.planner));
    setFilters(mergeTradingRouteFilters(merged.filters));
    setShipName(merged.shipName ?? "");
    setLogProfitBasis(mergeLogProfitBasis(merged.logProfitBasis));
  }, [settings]);

  useEffect(() => {
    schedulePersistedTradingRoutesState({
      planner,
      filters,
      shipName: shipName || undefined,
      presetId,
      logProfitBasis,
    });
  }, [planner, filters, shipName, presetId, logProfitBasis]);

  useEffect(() => {
    return () => terminateTradingRoutesWorker();
  }, []);

  const loadDistances = useCallback(async (candidates: TradingRoutesSnapshot["candidates"]) => {
    const systemIds = collectSystemIdsFromCandidates(candidates);
    const unique = [...new Set(systemIds)];
    if (unique.length === 0) return;

    setDistancesLoading(true);
    try {
      let distances = getCachedOrbitDistances() ?? {};
      const fetched = await fetchOrbitDistances(unique);
      distances = mergeOrbitDistances(distances, fetched);
      setCachedOrbitDistances(distances);
      setOrbitDistances(distances);
    } finally {
      setDistancesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!marketData) {
      if (uexStatus === "loading" || uexStatus === "idle") {
        setStatus("loading");
      } else if (uexStatus === "offline") {
        setStatus("error");
        setError(uexError);
      }
      return;
    }

    const abort = new AbortController();
    setBuilding(true);
    setError(uexError);

    void buildRouteSnapshotFromMarket(marketData, abort.signal)
      .then((built) => {
        if (abort.signal.aborted) return;
        setSnapshot({
          candidates: built.candidates,
          sellAlternatives: built.sellAlternatives,
          fetchedAt: built.fetchedAt,
          source: isFromSnapshot ? "cache" : "uex",
        });
        setStatus("ready");
        void loadDistances(built.candidates);
      })
      .catch((e) => {
        if (abort.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Failed to build trading routes";
        setError(message);
        setStatus("error");
      })
      .finally(() => {
        if (!abort.signal.aborted) setBuilding(false);
      });

    return () => abort.abort();
  }, [marketData, uexStatus, uexError, isFromSnapshot, loadDistances]);

  useEffect(() => {
    if (!snapshot?.candidates.length) {
      setAllRoutes([]);
      return;
    }

    const abort = new AbortController();
    setScoring(true);

    void scoreRouteCandidates(
      snapshot.candidates,
      debouncedPlanner,
      orbitDistances,
      shipName,
      abort.signal,
    )
      .then((routes) => {
        if (!abort.signal.aborted) setAllRoutes(routes);
      })
      .catch((e) => {
        if (abort.signal.aborted) return;
        console.warn("[TradingRoutes] score failed:", e);
        setAllRoutes([]);
      })
      .finally(() => {
        if (!abort.signal.aborted) setScoring(false);
      });

    return () => abort.abort();
  }, [snapshot, debouncedPlanner, orbitDistances, shipName]);

  const refresh = useCallback(
    async (force = false) => {
      setStatus("loading");
      setError(null);
      try {
        await refetchUex(force);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to refresh trading routes";
        setError(message);
        setStatus("error");
      }
    },
    [refetchUex],
  );

  const isLoading =
    status === "loading" ||
    status === "idle" ||
    building ||
    scoring ||
    ((uexStatus === "loading" || uexStatus === "idle") && !marketData) ||
    distancesLoading;

  const filteredRoutes = useMemo(
    () => filterTradingRoutes(allRoutes, debouncedFilters),
    [allRoutes, debouncedFilters],
  );

  const displayedRoutes = useMemo(
    () => filteredRoutes.slice(0, MAX_DISPLAYED_ROUTES),
    [filteredRoutes],
  );

  const stats = useMemo(() => computeStats(filteredRoutes), [filteredRoutes]);

  const filterOptions = useMemo(() => extractFilterOptions(allRoutes), [allRoutes]);

  const sellAlternatives: Record<number, SellAlternative[]> = snapshot?.sellAlternatives ?? {};

  const activePresetId = useMemo(
    () => detectMatchingPresetId(planner, filters, shipName),
    [planner, filters, shipName],
  );

  const updatePlanner = useCallback((patch: Partial<TradingRoutePlannerInput>) => {
    setPresetId(null);
    setPlanner((prev) => mergePlannerInput({ ...prev, ...patch }));
  }, []);

  const updateFilters = useCallback((patch: Partial<TradingRouteFilters>) => {
    setPresetId(null);
    setFilters((prev) => mergeTradingRouteFilters({ ...prev, ...patch }));
  }, []);

  const handleShipChange = useCallback((name: string, scu: number) => {
    setPresetId(null);
    setShipName(name);
    if (name && scu > 0) {
      setPlanner((prev) => mergePlannerInput({ ...prev, cargoScu: scu, shipScu: scu }));
    }
  }, []);

  const applyPreset = useCallback(
    (id: FilterPresetId) => {
      const applied = applyFilterPreset(
        id,
        { planner, filters, shipName },
        mergePlannerInput,
        mergeTradingRouteFilters,
      );
      setShipName(applied.shipName);
      setPlanner(applied.planner);
      setFilters(applied.filters);
      setPresetId(id);
    },
    [planner, filters, shipName],
  );

  const resetPlanner = useCallback(() => {
    setPlanner(DEFAULT_PLANNER_INPUT);
    setShipName("");
    setPresetId(null);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_TRADING_ROUTE_FILTERS);
    setPresetId(null);
  }, []);

  return {
    status: isLoading ? "loading" : status,
    error: error ?? uexError,
    uexIsStale,
    isFromSnapshot,
    snapshot,
    planner,
    filters,
    shipName,
    setShipName,
    activePresetId,
    applyPreset,
    updatePlanner,
    updateFilters,
    handleShipChange,
    resetPlanner,
    resetFilters,
    refresh,
    allRoutes,
    filteredRoutes,
    displayedRoutes,
    stats,
    filterOptions,
    sellAlternatives,
    fetchedAt: snapshot?.fetchedAt ?? marketData?.fetchedAt ?? null,
    logProfitBasis,
  };
}

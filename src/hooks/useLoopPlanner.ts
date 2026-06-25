import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_LOOP_PLANNER_FILTERS,
  loadPersistedLoopPlannerState,
  mergeLoopPlannerFilters,
  mergeLoopPlannerInput,
  schedulePersistedLoopPlannerState,
} from "@/features/trading-routes/default-loop-planner";
import { filterSortLoops } from "@/features/trading-routes/filter-loop-planner";
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
import { getTradingShipsList } from "@/lib/trading-routes/ships";
import { searchLoopsFromMarket } from "@/lib/trading-routes/loop-worker-client";
import type { OrbitDistanceMap } from "@/lib/uex/types";
import type {
  LoopPlannerFilters,
  LoopPlannerInput,
  LoopPlannerStats,
  TradeLoop,
} from "@/types/trading-route";

type LoadStatus = "idle" | "loading" | "ready" | "error";

function getShipNameByScu(scu: number): string {
  const ship = getTradingShipsList().find((s) => s.scu === scu);
  return ship?.name ?? "";
}

function computeLoopPlannerStats(loops: TradeLoop[]): LoopPlannerStats {
  const count = loops.length;
  if (count === 0) {
    return { count: 0, bestProfit: null, bestProfitPerMin: null, avgLegs: null };
  }

  let bestProfit = loops[0].totalProfit;
  let bestProfitPerMin = loops[0].profitPerMin;
  let totalHops = 0;

  for (const loop of loops) {
    if (loop.totalProfit > bestProfit) bestProfit = loop.totalProfit;
    if (loop.profitPerMin > bestProfitPerMin) bestProfitPerMin = loop.profitPerMin;
    totalHops += loop.legs.filter((leg) => leg.action === "buy").length;
  }

  return {
    count,
    bestProfit,
    bestProfitPerMin,
    avgLegs: totalHops / count,
  };
}

export function useLoopPlanner() {
  const { settings } = useSettings();
  const settingsBaselineApplied = useRef(false);
  const persisted = useMemo(
    () => loadPersistedLoopPlannerState(settings?.tradingDefaults),
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
  const [allLoops, setAllLoops] = useState<TradeLoop[]>([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [exploredNodes, setExploredNodes] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [orbitDistances, setOrbitDistances] = useState<OrbitDistanceMap>(
    () => getCachedOrbitDistances() ?? {},
  );
  const [distancesLoading, setDistancesLoading] = useState(false);
  const [distancesReady, setDistancesReady] = useState(false);
  const [planner, setPlanner] = useState<LoopPlannerInput>(() =>
    mergeLoopPlannerInput(persisted.planner),
  );
  const [filters, setFilters] = useState<LoopPlannerFilters>(() =>
    mergeLoopPlannerFilters(persisted.filters ?? DEFAULT_LOOP_PLANNER_FILTERS),
  );
  const [shipName, setShipName] = useState(() => {
    if (persisted.shipName) return persisted.shipName;
    const scu = persisted.planner?.shipScu;
    if (scu) return getShipNameByScu(scu);
    return "";
  });

  const debouncedPlanner = useDebouncedValue(planner, 300);
  const debouncedFilters = useDebouncedValue(filters, 300);

  useEffect(() => {
    if (!settings || settingsBaselineApplied.current) return;
    settingsBaselineApplied.current = true;
    const merged = loadPersistedLoopPlannerState(settings.tradingDefaults);
    setPlanner(mergeLoopPlannerInput(merged.planner));
    setFilters(mergeLoopPlannerFilters(merged.filters));
    setShipName(
      merged.shipName ?? (merged.planner?.shipScu ? getShipNameByScu(merged.planner.shipScu) : ""),
    );
  }, [settings]);

  useEffect(() => {
    schedulePersistedLoopPlannerState({
      planner,
      filters,
      shipName: shipName || undefined,
    });
  }, [planner, filters, shipName]);

  // Load orbit distances once per market + planner change (do NOT depend on orbitDistances state).
  useEffect(() => {
    if (!marketData) {
      setDistancesReady(false);
      return;
    }

    const market = marketData;
    let cancelled = false;

    async function loadDistances() {
      setDistancesLoading(true);
      setDistancesReady(false);

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
      } finally {
        if (!cancelled) setDistancesLoading(false);
      }
    }

    void loadDistances();

    return () => {
      cancelled = true;
    };
  }, [marketData, debouncedPlanner]);

  useEffect(() => {
    if (!marketData) {
      if (uexStatus === "loading" || uexStatus === "idle") {
        setStatus("loading");
      } else if (uexStatus === "offline") {
        setStatus("error");
        setError(uexError);
      }
      setAllLoops([]);
      setSearchTruncated(false);
      setExploredNodes(null);
      setSearching(false);
      return;
    }

    if (!distancesReady) return;

    const abort = new AbortController();
    setSearching(true);
    setSearchTruncated(false);
    setExploredNodes(null);
    setError(uexError);

    void searchLoopsFromMarket(marketData, debouncedPlanner, orbitDistances, {}, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) {
          setAllLoops(result.loops);
          setSearchTruncated(result.truncated);
          setExploredNodes(result.exploredNodes);
          setStatus("ready");
        }
      })
      .catch((e) => {
        if (abort.signal.aborted) return;
        const message = e instanceof Error ? e.message : "Failed to search loop routes";
        setError(message);
        setStatus("error");
        setAllLoops([]);
        setSearchTruncated(false);
        setExploredNodes(null);
      })
      .finally(() => {
        if (!abort.signal.aborted) setSearching(false);
      });

    return () => abort.abort();
  }, [marketData, debouncedPlanner, orbitDistances, distancesReady, uexError, uexStatus]);

  const refresh = useCallback(
    async (force = false) => {
      setStatus("loading");
      setError(null);
      try {
        await refetchUex(force);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to refresh loop planner";
        setError(message);
        setStatus("error");
      }
    },
    [refetchUex],
  );

  const waitingForMarket =
    (uexStatus === "loading" || uexStatus === "idle") && !marketData;

  const isInitialLoad = waitingForMarket || (Boolean(marketData) && !distancesReady && allLoops.length === 0);

  const isLoading = isInitialLoad || (searching && allLoops.length === 0 && status !== "ready");

  const loops = useMemo(
    () => filterSortLoops(allLoops, debouncedFilters),
    [allLoops, debouncedFilters],
  );

  const stats = useMemo(() => computeLoopPlannerStats(loops), [loops]);

  const updatePlanner = useCallback((patch: Partial<LoopPlannerInput>) => {
    setPlanner((prev) => mergeLoopPlannerInput({ ...prev, ...patch }));
  }, []);

  const replacePlanner = useCallback((next: LoopPlannerInput) => {
    setPlanner(next);
  }, []);

  const updateFilters = useCallback((patch: Partial<LoopPlannerFilters>) => {
    setFilters((prev) => mergeLoopPlannerFilters({ ...prev, ...patch }));
  }, []);

  const updateShip = useCallback((name: string, scu: number) => {
    setShipName(name);
    if (scu > 0) {
      setPlanner((prev) =>
        mergeLoopPlannerInput({ ...prev, shipScu: scu, cargoScu: scu }),
      );
    } else {
      setPlanner((prev) => mergeLoopPlannerInput({ ...prev, shipScu: undefined }));
    }
  }, []);

  return {
    status: isLoading ? "loading" : status,
    error: error ?? uexError,
    uexIsStale,
    isFromSnapshot,
    planner,
    filters,
    shipName,
    loops,
    allLoops,
    stats,
    updatePlanner,
    replacePlanner,
    updateFilters,
    updateShip,
    refresh,
    fetchedAt: marketData?.fetchedAt ?? null,
    searching,
    searchTruncated,
    exploredNodes,
    distancesLoading,
  };
}

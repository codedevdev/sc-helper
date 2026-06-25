import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Coins, RefreshCw, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLoopPlanner } from "@/hooks/useLoopPlanner";
import { useSavedLoops } from "@/hooks/useSavedLoops";
import { useTradingShips } from "@/hooks/useTradingShips";
import { useUexData } from "@/hooks/useUexData";
import { applyQuickSearchPatch } from "@/features/trading-routes/loop-planner-presets";
import { formatAuec } from "@/lib/formatAuec";
import type { SavedTradeLoop, TradeLoop } from "@/types/trading-route";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { LoopDetailDialog } from "./LoopDetailDialog";
import { LoopFiltersPanel } from "./LoopFiltersPanel";
import { LoopResultFiltersPanel } from "./LoopResultFiltersPanel";
import { LoopResultsCards } from "./LoopResultsCards";
import { LoopSortBar } from "./LoopSortBar";
import { SavedLoopsPanel } from "./SavedLoopsPanel";
import { SaveLoopDialog } from "./SaveLoopDialog";
import { PILOT_MODE_MAX_RESULTS } from "./pilot-mode";
import { ResultsSearchBar } from "./ResultsSearchBar";
import { SearchDiagnostics } from "./SearchDiagnostics";
import { TradingRoutesSkeleton } from "./TradingRoutesSkeleton";
import { buildLoopFilterChips } from "./route-filter-chips";

interface LoopPlannerViewProps {
  pilotMode?: boolean;
  onLogAsIncome?: (loop: TradeLoop, shipName: string) => void;
  onStartSession?: (loop: TradeLoop, shipName: string) => void;
}

export function LoopPlannerView({
  pilotMode,
  onLogAsIncome,
  onStartSession,
}: LoopPlannerViewProps) {
  const {
    status,
    error,
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
    fetchedAt,
    searching,
    searchTruncated,
    exploredNodes,
  } = useLoopPlanner();

  const { savedLoops, saveLoop, renameLoop, deleteLoop } = useSavedLoops();
  const { ships, status: shipsStatus } = useTradingShips();

  const { status: uexStatus } = useUexData();

  const [selectedLoop, setSelectedLoop] = useState<TradeLoop | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSavedLoop, setSelectedSavedLoop] = useState<TradeLoop | null>(null);
  const [savedDetailOpen, setSavedDetailOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: marketData } = useUexData();
  const terminals = useMemo(
    () =>
      (marketData?.terminals ?? [])
        .map((t) => ({ id: t.id, label: t.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [marketData?.terminals],
  );

  const systems = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of marketData?.terminals ?? []) {
      const id = t.id_star_system;
      const name = t.star_system_name?.trim();
      if (id > 0 && name && !map.has(id)) {
        map.set(id, name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [marketData?.terminals]);

  const stantonSystemId = useMemo(() => {
    for (const t of marketData?.terminals ?? []) {
      if (t.star_system_name?.toLowerCase() === "stanton" && t.id_star_system > 0) {
        return t.id_star_system;
      }
    }
    return undefined;
  }, [marketData?.terminals]);

  const commodities = useMemo(
    () =>
      (marketData?.commodities ?? [])
        .map((c) => c.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [marketData?.commodities],
  );

  const displayedLoops = useMemo(
    () => (pilotMode ? loops.slice(0, PILOT_MODE_MAX_RESULTS) : loops),
    [loops, pilotMode],
  );

  const loopFilterChips = useMemo(
    () => buildLoopFilterChips(filters, updateFilters, { shipName, cargoScu: planner.cargoScu }),
    [filters, updateFilters, shipName, planner.cargoScu],
  );

  const isLoading = status === "loading";
  const isSearching = searching && !isLoading;
  const shipsLoading = shipsStatus === "loading";

  function handleShipChange(name: string, scu: number) {
    updateShip(name, scu);
  }

  function handleLoopSelect(loop: TradeLoop) {
    setSelectedLoop(loop);
    setDetailOpen(true);
  }

  function handleSavedOpen(saved: SavedTradeLoop) {
    setSelectedSavedLoop(saved.loop);
    setSavedDetailOpen(true);
  }

  async function handleSaveLoop(name: string) {
    if (!selectedLoop) return;
    setSaving(true);
    try {
      await saveLoop(selectedLoop, name, planner);
      setSaveDialogOpen(false);
      setDetailOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleLogAsIncome(loop: TradeLoop) {
    setDetailOpen(false);
    setSavedDetailOpen(false);
    onLogAsIncome?.(loop, shipName);
  }

  function handleStartSession(loop: TradeLoop) {
    setDetailOpen(false);
    setSavedDetailOpen(false);
    onStartSession?.(loop, shipName);
  }

  function applyQuickSearchPreset() {
    updatePlanner(applyQuickSearchPatch(planner));
  }

  return (
    <>
      {status === "error" && !isFromSnapshot && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-destructive">
            <span>
              Could not load loops: {error ?? "Unknown error"}
              {uexStatus === "offline" && (
                <>
                  {" "}
                  <Link to="/settings" className="underline underline-offset-4">
                    Configure UEX API
                  </Link>
                </>
              )}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh(true)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {(isFromSnapshot || uexIsStale) && status !== "error" && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-amber-200">
            <span>
              {isFromSnapshot
                ? (error ??
                  "Showing cached UEX prices. Live data is unavailable — refresh when online.")
                : "Prices may be outdated. Refresh for the latest UEX data."}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh(true)}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "error" && isFromSnapshot && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-amber-200">
            <span>{error ?? "Using cached prices. Live UEX sync failed."}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh(true)}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {fetchedAt && status === "ready" && (
        <p className="mb-4 text-xs text-muted-foreground">
          Prices updated {new Date(fetchedAt).toLocaleString()}. UEX data may lag in-game supply.
        </p>
      )}

      {isSearching && (
        <p className="mb-4 text-xs text-muted-foreground">Searching loop routes…</p>
      )}

      {searchTruncated && status === "ready" && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-amber-200">
            <span>
              Search limit reached — showing partial results. Try excluding systems, enabling Same
              system, or lowering max legs.
              {exploredNodes != null && (
                <span className="ml-1 text-amber-200/70">
                  ({exploredNodes.toLocaleString()} nodes explored)
                </span>
              )}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={applyQuickSearchPreset}>
              Apply Quick search preset
            </Button>
          </CardContent>
        </Card>
      )}

      <SavedLoopsPanel
        savedLoops={savedLoops}
        onOpen={handleSavedOpen}
        onRename={async (id, name) => {
          await renameLoop(id, name);
        }}
        onDelete={deleteLoop}
      />

      {isLoading ? (
        <TradingRoutesSkeleton />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Loops found"
              value={stats.count > 0 ? String(stats.count) : "—"}
              hint={loops.length === 0 ? "Adjust filters or cargo" : undefined}
              icon={RefreshCw}
            />
            <StatCard
              title="Best profit"
              value={stats.bestProfit != null ? formatAuec(stats.bestProfit) : "—"}
              icon={Coins}
              variant="profit"
            />
            <StatCard
              title="Best profit/min"
              value={
                stats.bestProfitPerMin != null
                  ? `${formatAuec(stats.bestProfitPerMin)}/min`
                  : "—"
              }
              icon={TrendingUp}
              variant="income"
            />
            <StatCard
              title="Avg legs"
              value={stats.avgLegs != null ? stats.avgLegs.toFixed(1) : "—"}
              icon={Clock}
            />
          </div>

          {!pilotMode && (
            <Card className="mb-6 border-border/80 bg-card/70 backdrop-blur-md">
              <CardContent className="pt-6">
                <LoopFiltersPanel
                  planner={planner}
                  shipName={shipName}
                  ships={ships}
                  shipsLoading={shipsLoading}
                  terminals={terminals}
                  systems={systems}
                  stantonSystemId={stantonSystemId}
                  disabled={isLoading}
                  onPlannerChange={updatePlanner}
                  onPlannerReplace={replacePlanner}
                  onShipChange={handleShipChange}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-border/80 bg-card/70 backdrop-blur-md">
            <CardContent className="pt-6">
              <LoopSortBar sort={filters.sort} onSortChange={(sort) => updateFilters({ sort })} />
              <LoopResultFiltersPanel
                filters={filters}
                systems={systems}
                commodities={commodities}
                disabled={isLoading}
                onFiltersChange={updateFilters}
              />
              <div className="mb-4">
                <ActiveFilterChips
                  chips={loopFilterChips.chips}
                  onRemove={loopFilterChips.remove}
                  onClearAll={() =>
                    updateFilters({
                      query: "",
                      commodity: "",
                      system: "",
                      terminal: "",
                      minProfit: undefined,
                      maxTime: undefined,
                    })
                  }
                />
              </div>
              <ResultsSearchBar
                query={filters.query ?? ""}
                filteredCount={displayedLoops.length}
                totalCount={allLoops.length}
                placeholder="Filter loop results…"
                onQueryChange={(query) => updateFilters({ query })}
                onClear={() => updateFilters({ query: "" })}
              />
              <LoopResultsCards
                loops={displayedLoops}
                pilotMode={pilotMode}
                cargoScu={planner.cargoScu}
                emptyMessage={
                  status === "ready" ? "No profitable loop routes match your filters." : ""
                }
                emptyHint="Try increasing cargo SCU, budget, or relaxing leg constraints."
                onSelect={handleLoopSelect}
              />
              <SearchDiagnostics
                mode="loop"
                resultCount={allLoops.length}
                exploredNodes={exploredNodes}
                truncated={searchTruncated}
              />
            </CardContent>
          </Card>
        </>
      )}

      <LoopDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        loop={selectedLoop}
        onSave={() => setSaveDialogOpen(true)}
        onLogAsIncome={
          selectedLoop && onLogAsIncome
            ? () => handleLogAsIncome(selectedLoop)
            : undefined
        }
        onStartSession={
          selectedLoop && onStartSession
            ? () => handleStartSession(selectedLoop)
            : undefined
        }
      />

      <LoopDetailDialog
        open={savedDetailOpen}
        onOpenChange={setSavedDetailOpen}
        loop={selectedSavedLoop}
        readOnly
        onLogAsIncome={
          selectedSavedLoop && onLogAsIncome
            ? () => handleLogAsIncome(selectedSavedLoop)
            : undefined
        }
        onStartSession={
          selectedSavedLoop && onStartSession
            ? () => handleStartSession(selectedSavedLoop)
            : undefined
        }
      />

      <SaveLoopDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        loop={selectedLoop}
        onSave={handleSaveLoop}
        saving={saving}
      />
    </>
  );
}

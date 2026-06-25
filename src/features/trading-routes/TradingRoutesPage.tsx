import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Route, TrendingUp, Package, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { useUexData } from "@/hooks/useUexData";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FarmingSessionFormDialog } from "@/features/sessions/FarmingSessionFormDialog";
import {
  TransactionFormDialog,
  type TransactionFormDefaults,
} from "@/features/transactions/TransactionFormDialog";
import { useFarmingSessions } from "@/hooks/useFarmingSessions";
import { useTradingRoutes } from "@/hooks/useTradingRoutes";
import { useTradingShips } from "@/hooks/useTradingShips";
import { useTransactions } from "@/hooks/useTransactions";
import { createSessionTransaction } from "@/lib/createSessionTransaction";
import { formatAuec } from "@/lib/formatAuec";
import {
  buildLoopSessionDefaults,
  buildLoopTransactionDefaults,
  buildRouteSessionDefaults,
  buildRouteTransactionDefaults,
} from "@/lib/trading-routes/route-integration";
import { cn } from "@/lib/utils";
import type { FarmingSessionFormDefaults } from "@/features/sessions/FarmingSessionFormDialog";
import type { TradeLoop, TradingRoute, TradingRouteMode } from "@/types/trading-route";
import { MAX_DISPLAYED_ROUTES } from "@/types/trading-route";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { EnRouteView } from "./EnRouteView";
import { LoopPlannerView } from "./LoopPlannerView";
import { MarketLookupView } from "./MarketLookupView";
import {
  PILOT_MODE_MAX_RESULTS,
  loadPilotMode,
  savePilotMode,
} from "./pilot-mode";
import { PilotModeToggle } from "./PilotModeToggle";
import { ResultsSearchBar } from "./ResultsSearchBar";
import { RouteFiltersPanel } from "./RouteFiltersPanel";
import { RouteModeToggle } from "./RouteModeToggle";
import { RouteResultsTable } from "./RouteResultsTable";
import { RouteSortBar } from "./RouteSortBar";
import { RouteDetailDialog } from "./RouteDetailDialog";
import { SearchDiagnostics } from "./SearchDiagnostics";
import { TradingRoutesSkeleton } from "./TradingRoutesSkeleton";
import { buildRouteFilterChips } from "./route-filter-chips";

export function TradingRoutesPage() {
  const [mode, setMode] = useState<TradingRouteMode>("single");
  const [pilotMode, setPilotMode] = useState(() => loadPilotMode());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TradingRoute | null>(null);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [txDefaults, setTxDefaults] = useState<TransactionFormDefaults | undefined>();
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionDefaults, setSessionDefaults] = useState<FarmingSessionFormDefaults | undefined>();

  const { create: createTransaction } = useTransactions();
  const { create: createSession } = useFarmingSessions();

  useEffect(() => {
    savePilotMode(pilotMode);
  }, [pilotMode]);

  function handleRowSelect(route: TradingRoute) {
    setSelectedRoute(route);
    setDetailOpen(true);
  }

  const {
    status,
    error,
    uexIsStale,
    isFromSnapshot,
    planner,
    filters,
    shipName,
    activePresetId,
    applyPreset,
    handleShipChange,
    updatePlanner,
    updateFilters,
    refresh,
    displayedRoutes,
    filteredRoutes,
    allRoutes,
    stats,
    filterOptions,
    fetchedAt,
    sellAlternatives,
    logProfitBasis,
  } = useTradingRoutes();

  const { ships, status: shipsStatus } = useTradingShips();
  const shipsLoading = shipsStatus === "loading";

  const { status: uexStatus } = useUexData();

  const isSingleMode = mode === "single";
  const isLoopMode = mode === "loop";
  const isLoading = status === "loading" || status === "idle";
  const isTruncated = filteredRoutes.length > MAX_DISPLAYED_ROUTES;

  const pilotDisplayedRoutes = useMemo(
    () => (pilotMode ? displayedRoutes.slice(0, PILOT_MODE_MAX_RESULTS) : displayedRoutes),
    [displayedRoutes, pilotMode],
  );

  const routeFilterChips = useMemo(
    () => buildRouteFilterChips(filters, updateFilters),
    [filters, updateFilters],
  );

  function openLogAsIncome() {
    if (!selectedRoute) return;
    setDetailOpen(false);
    setTxDefaults(
      buildRouteTransactionDefaults(selectedRoute, {
        logProfitBasis,
        shipName,
      }),
    );
    setTxFormOpen(true);
  }

  function openStartSession() {
    if (!selectedRoute) return;
    setDetailOpen(false);
    setSessionDefaults(buildRouteSessionDefaults(selectedRoute, { shipName }));
    setSessionFormOpen(true);
  }

  function openLoopLogAsIncome(loop: TradeLoop, loopShipName: string) {
    setTxDefaults(buildLoopTransactionDefaults(loop, { shipName: loopShipName }));
    setTxFormOpen(true);
  }

  function openLoopStartSession(loop: TradeLoop, loopShipName: string) {
    setSessionDefaults(buildLoopSessionDefaults(loop, { shipName: loopShipName }));
    setSessionFormOpen(true);
  }

  function handlePlanFromLookup(commodity: string) {
    updateFilters({ commodity });
    setMode("single");
  }

  const subtitleByMode: Record<TradingRouteMode, string> = {
    single: "Find profitable buy → sell routes from UEX Corp live prices",
    loop: "Find profitable circular trade loops (3–7 legs) from UEX Corp live prices",
    "en-route": "Profit while traveling between two terminals with optional stops",
    lookup: "Browse commodity and terminal prices across the verse",
  };

  return (
    <>
      <PageHeader
        title="Trading Routes"
        subtitle={subtitleByMode[mode]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PilotModeToggle
              enabled={pilotMode}
              onChange={setPilotMode}
              disabled={mode === "lookup"}
            />
            {isSingleMode && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isLoading}
                onClick={() => void refresh(true)}
              >
                <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        }
      />

      <RouteModeToggle mode={mode} onModeChange={setMode} disabled={!isSingleMode && isLoading} />

      {isLoopMode ? (
        <LoopPlannerView
          pilotMode={pilotMode}
          onLogAsIncome={openLoopLogAsIncome}
          onStartSession={openLoopStartSession}
        />
      ) : mode === "en-route" ? (
        <EnRouteView pilotMode={pilotMode} />
      ) : mode === "lookup" ? (
        <MarketLookupView onPlanRoute={handlePlanFromLookup} onModeChange={setMode} />
      ) : (
        <>
          {status === "error" && !isFromSnapshot && (
            <Card className="mb-6 border-destructive/40 bg-destructive/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-destructive">
                <span>
                  Could not load routes: {error ?? "Unknown error"}
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

          {isLoading ? (
            <TradingRoutesSkeleton />
          ) : (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Routes"
                  value={stats.count > 0 ? String(stats.count) : "—"}
                  hint={
                    isTruncated
                      ? `Showing top ${MAX_DISPLAYED_ROUTES}`
                      : filteredRoutes.length === 0
                        ? "Adjust filters or cargo"
                        : undefined
                  }
                  icon={Route}
                />
                <StatCard
                  title="Best profit"
                  value={stats.bestProfit != null ? formatAuec(stats.bestProfit) : "—"}
                  icon={Coins}
                  variant="profit"
                />
                <StatCard
                  title="Best ROI"
                  value={stats.bestRoi != null ? `${stats.bestRoi.toFixed(1)}%` : "—"}
                  icon={TrendingUp}
                  variant="income"
                />
                <StatCard
                  title="Commodities"
                  value={stats.commodityCount > 0 ? String(stats.commodityCount) : "—"}
                  icon={Package}
                />
              </div>

              {!pilotMode && (
                <Card className="mb-6 border-border/80 bg-card/70 backdrop-blur-md">
                  <CardContent className="pt-6">
                    <RouteFiltersPanel
                      planner={planner}
                      filters={filters}
                      shipName={shipName}
                      ships={ships}
                      shipsLoading={shipsLoading}
                      activePresetId={activePresetId}
                      systems={filterOptions.systems}
                      commodities={filterOptions.commodities}
                      disabled={isLoading}
                      onPlannerChange={updatePlanner}
                      onFiltersChange={updateFilters}
                      onShipChange={handleShipChange}
                      onPresetSelect={(id) => {
                        applyPreset(id);
                        if (id === "pilot") setPilotMode(true);
                      }}
                    />
                    <div className="mt-4">
                      <ActiveFilterChips
                        chips={routeFilterChips.chips}
                        onRemove={routeFilterChips.remove}
                        onClearAll={() =>
                          updateFilters({
                            system: "",
                            buySystem: "",
                            sellSystem: "",
                            commodity: "",
                            legality: "all",
                            sameSystem: "all",
                            cargoCenter: "all",
                            autoloadOnly: false,
                            excludeVolatileQt: false,
                            minStock: undefined,
                            minSellStock: undefined,
                            minContainerSize: undefined,
                            query: "",
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {pilotMode && (
                <Card className="mb-6 border-primary/20 bg-primary/5">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
                    <span>Pilot mode — top {PILOT_MODE_MAX_RESULTS} routes with key stats only.</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyPreset("pilot")}>
                      Apply Pilot preset
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/80 bg-card/70 backdrop-blur-md">
                <CardContent className="overflow-x-auto pt-6">
                  <RouteSortBar
                    sort={filters.sort}
                    onSortChange={(sort) => updateFilters({ sort })}
                  />
                  <ResultsSearchBar
                    query={filters.query ?? ""}
                    filteredCount={pilotDisplayedRoutes.length}
                    totalCount={allRoutes.length}
                    onQueryChange={(query) => updateFilters({ query })}
                    onClear={() => updateFilters({ query: "" })}
                  />
                  <RouteResultsTable
                    routes={pilotDisplayedRoutes}
                    pilotMode={pilotMode}
                    emptyMessage={
                      status === "ready" ? "No profitable routes match your filters." : ""
                    }
                    emptyHint="Try increasing cargo SCU, budget, or relaxing filters."
                    onRowSelect={handleRowSelect}
                  />
                  <SearchDiagnostics mode="single" resultCount={filteredRoutes.length} />
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      <RouteDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        route={selectedRoute}
        sellAlternatives={
          selectedRoute ? (sellAlternatives[selectedRoute.commodityId] ?? []) : []
        }
        onLogAsIncome={selectedRoute ? openLogAsIncome : undefined}
        onStartSession={selectedRoute ? openStartSession : undefined}
      />

      <TransactionFormDialog
        open={txFormOpen}
        onOpenChange={setTxFormOpen}
        defaultType="income"
        defaults={txDefaults}
        onSubmit={async (input) => {
          await createTransaction(input);
        }}
      />

      <FarmingSessionFormDialog
        open={sessionFormOpen}
        onOpenChange={setSessionFormOpen}
        defaults={sessionDefaults}
        onSubmit={async (input, createTx) => {
          const session = await createSession(input);
          if (createTx) {
            const txInput = createSessionTransaction(session);
            if (txInput) {
              await createTransaction(txInput);
            }
          }
        }}
      />
    </>
  );
}

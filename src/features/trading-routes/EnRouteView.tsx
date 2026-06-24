import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, TrendingUp, Coins, Clock } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useEnRoutePlanner } from "@/hooks/useEnRoutePlanner";
import { useUexData } from "@/hooks/useUexData";
import { formatAuec } from "@/lib/formatAuec";
import { cn } from "@/lib/utils";
import type { EnRouteResult } from "@/types/trading-route";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { ResultsSearchBar } from "./ResultsSearchBar";
import { SearchDiagnostics } from "./SearchDiagnostics";
import { ShipSelect } from "./ShipSelect";
import { TradingRoutesSkeleton } from "./TradingRoutesSkeleton";

interface EnRouteViewProps {
  pilotMode?: boolean;
}

function EnRouteResultCard({ result }: { result: EnRouteResult }) {
  return (
    <Card className="border-border/60 bg-muted/10">
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">
              {result.originName} → {result.destinationName}
            </p>
            <p className="text-lg font-semibold text-emerald-400 tabular-nums">
              +{formatAuec(result.totalProfit)}
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {result.legs.length} stop{result.legs.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground tabular-nums">
          <span>+{formatAuec(result.profitPerMin)}/min</span>
          <span>≈{Math.round(result.totalMinutes)} min</span>
          <span>Detour {result.detourPercent.toFixed(0)}%</span>
        </div>
        {result.legs.length > 0 && (
          <ol className="space-y-1 text-xs text-muted-foreground">
            {result.legs.map((leg, i) => (
              <li key={`${leg.commodityId}-${i}`}>
                {i + 1}. Buy {leg.commodity} @ {leg.buyTerminal} → sell @ {leg.sellTerminal} (+
                {formatAuec(leg.profit)})
              </li>
            ))}
          </ol>
        )}
        {result.legs.length === 0 && (
          <p className="text-xs text-muted-foreground">Direct flight — no profitable stops</p>
        )}
      </CardContent>
    </Card>
  );
}

export function EnRouteView({ pilotMode }: EnRouteViewProps) {
  const {
    status,
    error,
    uexIsStale,
    isFromSnapshot,
    planner,
    filters,
    results,
    allResults,
    updatePlanner,
    updateFilters,
    refresh,
    fetchedAt,
    searching,
    searchMs,
  } = useEnRoutePlanner();

  const { status: uexStatus } = useUexData();
  const { data: marketData } = useUexData();

  const terminals = useMemo(
    () =>
      (marketData?.terminals ?? [])
        .map((t) => ({ value: String(t.id), label: t.nickname || t.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [marketData?.terminals],
  );

  const isLoading = status === "loading";
  const displayed = pilotMode ? results.slice(0, 5) : results;

  const chips = useMemo(() => {
    const list = [];
    if (filters.query?.trim()) list.push({ id: "query", label: `“${filters.query.trim()}”` });
    if (filters.minProfit != null && filters.minProfit > 0) {
      list.push({ id: "minProfit", label: `Profit ≥ ${filters.minProfit}` });
    }
    return list;
  }, [filters]);

  return (
    <>
      {status === "error" && !isFromSnapshot && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-destructive">
            <span>
              Could not load en-route data: {error ?? "Unknown error"}
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
            <span>Prices may be outdated. Refresh for the latest UEX data.</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh(true)}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {fetchedAt && status === "ready" && (
        <p className="mb-4 text-xs text-muted-foreground">
          Prices updated {new Date(fetchedAt).toLocaleString()}.
        </p>
      )}

      {isLoading ? (
        <TradingRoutesSkeleton />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Routes" value={results.length > 0 ? String(results.length) : "—"} icon={MapPin} />
            <StatCard
              title="Best profit"
              value={results[0] ? formatAuec(results[0].totalProfit) : "—"}
              icon={Coins}
              variant="profit"
            />
            <StatCard
              title="Best /min"
              value={results[0] ? `${formatAuec(results[0].profitPerMin)}/min` : "—"}
              icon={TrendingUp}
              variant="income"
            />
            <StatCard
              title="Direct time"
              value={results[0] ? `≈${Math.round(results[0].directMinutes)} min` : "—"}
              icon={Clock}
            />
          </div>

          <Card className="mb-6 border-border/80 bg-card/70 backdrop-blur-md">
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SearchableSelect
                  label="Origin"
                  value={planner.originTerminalId ? String(planner.originTerminalId) : ""}
                  options={terminals}
                  placeholder="Search origin…"
                  disabled={isLoading}
                  onValueChange={(v) => updatePlanner({ originTerminalId: Number(v) })}
                />
                <SearchableSelect
                  label="Destination"
                  value={planner.destinationTerminalId ? String(planner.destinationTerminalId) : ""}
                  options={terminals}
                  placeholder="Search destination…"
                  disabled={isLoading}
                  onValueChange={(v) => updatePlanner({ destinationTerminalId: Number(v) })}
                />
                <div className="space-y-2">
                  <Label htmlFor="er-stops">Max stops</Label>
                  <Input
                    id="er-stops"
                    type="number"
                    min={0}
                    max={5}
                    value={planner.maxStops ?? 3}
                    onChange={(e) =>
                      updatePlanner({ maxStops: Math.min(5, Math.max(0, Number(e.target.value) || 0)) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="er-detour">Max detour %</Label>
                  <Input
                    id="er-detour"
                    type="number"
                    min={0}
                    max={100}
                    value={planner.maxDetourPercent ?? 25}
                    onChange={(e) =>
                      updatePlanner({
                        maxDetourPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                  />
                </div>
                <ShipSelect
                  shipName=""
                  onShipChange={(_name, scu) => {
                    if (scu > 0) updatePlanner({ cargoScu: scu, shipScu: scu });
                  }}
                  disabled={isLoading}
                />
                <div className="space-y-2">
                  <Label htmlFor="er-cargo">Cargo (SCU)</Label>
                  <Input
                    id="er-cargo"
                    type="number"
                    min={1}
                    value={planner.cargoScu}
                    onChange={(e) =>
                      updatePlanner({ cargoScu: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Select
                    value={filters.sort}
                    onValueChange={(v) =>
                      updateFilters({ sort: v as typeof filters.sort })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total-profit">Total profit</SelectItem>
                      <SelectItem value="profit-per-min">Profit / min</SelectItem>
                      <SelectItem value="total-time">Fastest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/70 backdrop-blur-md">
            <CardContent className="pt-6">
              {searching && (
                <p className="mb-4 text-xs text-muted-foreground">Searching en-route paths…</p>
              )}
              <ResultsSearchBar
                query={filters.query ?? ""}
                filteredCount={displayed.length}
                totalCount={allResults.length}
                placeholder="Filter en-route results…"
                onQueryChange={(query) => updateFilters({ query })}
                onClear={() => updateFilters({ query: "", minProfit: undefined })}
              />
              <ActiveFilterChips
                chips={chips}
                onRemove={(id) => {
                  if (id === "query") updateFilters({ query: "" });
                  if (id === "minProfit") updateFilters({ minProfit: undefined });
                }}
              />
              <div className={cn("mt-4 grid gap-4", pilotMode ? "max-w-2xl" : "sm:grid-cols-2")}>
                {displayed.map((result) => (
                  <EnRouteResultCard key={result.id} result={result} />
                ))}
              </div>
              {displayed.length === 0 && status === "ready" && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {planner.originTerminalId && planner.destinationTerminalId
                    ? "No profitable en-route paths match your constraints."
                    : "Select origin and destination terminals to search."}
                </p>
              )}
              <SearchDiagnostics
                searchMs={searchMs}
                resultCount={allResults.length}
                mode="en-route"
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

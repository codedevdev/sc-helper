import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatAuec } from "@/lib/formatAuec";
import { cn } from "@/lib/utils";
import type { TradeLoop } from "@/types/trading-route";
import { loopHopCount } from "./loop-checklist";
import { loopMinSellStock, stockSeverity } from "./route-filter-utils";

interface LoopResultsCardsProps {
  loops: TradeLoop[];
  emptyMessage: string;
  emptyHint?: string;
  pilotMode?: boolean;
  cargoScu?: number;
  onSelect?: (loop: TradeLoop) => void;
}

function terminalPathSnippet(loop: TradeLoop): string {
  const names = loop.legs.map((leg) => leg.terminal.terminal);
  if (names.length === 0) return "";
  if (names.length <= 3) return names.join(" → ");
  return `${names[0]} → … → ${names[names.length - 1]}`;
}

export function LoopResultsCards({
  loops,
  emptyMessage,
  emptyHint,
  pilotMode,
  cargoScu,
  onSelect,
}: LoopResultsCardsProps) {
  if (loops.length === 0) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="No loop routes"
        description={emptyHint ? `${emptyMessage} ${emptyHint}` : emptyMessage}
      />
    );
  }

  const gridClass = pilotMode
    ? "grid gap-4 sm:grid-cols-1 max-w-2xl"
    : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={gridClass}>
      {loops.map((loop) => {
        const hops = loopHopCount(loop);
        const path = terminalPathSnippet(loop);
        const maxChips = pilotMode ? 6 : 4;
        const commodities = loop.commoditiesUsed;
        const visibleCommodities = commodities.slice(0, maxChips);
        const extraCount = commodities.length - maxChips;
        const minStock = loopMinSellStock(loop);
        const plannedScu = cargoScu ?? loop.totalScuTurnover / Math.max(hops, 1);
        const severity = stockSeverity(minStock ?? undefined, plannedScu);

        return (
          <Card
            key={loop.id}
            className={cn(
              "border-border/60 bg-muted/10 transition-colors hover:border-primary/40 hover:bg-muted/20",
              onSelect && "cursor-pointer",
              pilotMode && "border-primary/20",
            )}
            onClick={() => onSelect?.(loop)}
            onKeyDown={(e) => {
              if (onSelect && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(loop);
              }
            }}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
          >
            <CardContent className={cn("space-y-3", pilotMode ? "pt-6" : "pt-5")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p
                  className={cn(
                    "font-semibold text-emerald-400 tabular-nums",
                    pilotMode ? "text-2xl" : "text-lg",
                  )}
                >
                  +{formatAuec(loop.totalProfit)}
                </p>
                <Badge variant="secondary" className="text-[10px]">
                  {hops} legs
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
                <span>+{formatAuec(loop.profitPerMin)}/min</span>
                <span>≈{loop.totalTime} min</span>
                {minStock != null && (
                  <span
                    className={cn(
                      severity === "danger" && "text-red-400",
                      severity === "warning" && "text-amber-400",
                    )}
                  >
                    Min stock {minStock} SCU
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {loop.systemsVisited.map((system) => (
                  <Badge key={system} variant="secondary" className="text-[10px]">
                    {system}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-1">
                {visibleCommodities.map((name) => (
                  <Badge key={name} variant="outline" className="text-[10px]">
                    {name}
                  </Badge>
                ))}
                {extraCount > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{extraCount}
                  </Badge>
                )}
              </div>

              {path && (
                <p className="truncate text-xs text-muted-foreground" title={path}>
                  {path}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

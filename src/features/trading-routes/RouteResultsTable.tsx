import { Route, Package, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatAuec } from "@/lib/formatAuec";
import { cn } from "@/lib/utils";
import type { TradingRoute } from "@/types/trading-route";
import { stockSeverity } from "./route-filter-utils";
import { getLoadMethodLabel } from "./route-detail-helpers";

interface RouteResultsTableProps {
  routes: TradingRoute[];
  emptyMessage: string;
  emptyHint?: string;
  pilotMode?: boolean;
  onRowSelect?: (route: TradingRoute) => void;
}

function formatPricePerScu(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function roiClassName(roi: number): string {
  if (roi >= 30) return "text-emerald-400";
  if (roi >= 15) return "text-amber-400/90";
  return "text-muted-foreground";
}

function LoadIcon({ route }: { route: TradingRoute }) {
  if (route.buy.hasCargoCenter) {
    return (
      <span title="Cargo center">
        <Warehouse className="size-3.5" />
      </span>
    );
  }
  if (route.buy.hasFreightElevator) {
    return (
      <span title="Freight elevator">
        <Package className="size-3.5" />
      </span>
    );
  }
  return <span className="text-[10px] text-muted-foreground">Manual</span>;
}

function StockCell({ stock, plannedScu }: { stock: number | undefined; plannedScu: number }) {
  const severity = stockSeverity(stock, plannedScu);
  const label = stock != null && stock > 0 ? `${stock} SCU` : "—";
  return (
    <span
      className={cn(
        "tabular-nums",
        severity === "danger" && "text-red-400",
        severity === "warning" && "text-amber-400",
        severity === "ok" && "text-muted-foreground",
        severity === "unknown" && "text-muted-foreground/70",
      )}
    >
      {label}
    </span>
  );
}

export function RouteResultsTable({
  routes,
  emptyMessage,
  emptyHint,
  pilotMode,
  onRowSelect,
}: RouteResultsTableProps) {
  if (routes.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="No routes"
        description={emptyHint ? `${emptyMessage} ${emptyHint}` : emptyMessage}
      />
    );
  }

  if (pilotMode) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {routes.map((r, index) => {
          const sellStock = r.sell.scuStock ?? r.sell.scu;
          const severity = stockSeverity(sellStock, r.effectiveScu);
          return (
            <button
              key={`${r.commodityId}-${r.buy.terminalId}-${r.sell.terminalId}-${index}`}
              type="button"
              className="rounded-lg border border-border/60 bg-muted/10 p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
              onClick={() => onRowSelect?.(r)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.commodity}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.buy.terminal} → {r.sell.terminal}
                  </p>
                </div>
                <p className="text-lg font-semibold text-emerald-400 tabular-nums">
                  +{formatAuec(r.grossProfit)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground tabular-nums">
                <span>+{formatAuec(r.profitPerMin)}/min</span>
                <span
                  className={cn(
                    severity === "danger" && "text-red-400",
                    severity === "warning" && "text-amber-400",
                  )}
                >
                  Stock {sellStock > 0 ? `${sellStock} SCU` : "?"}
                </span>
                <span>≈{r.time.total} min</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Commodity</TableHead>
          <TableHead>Buy @</TableHead>
          <TableHead>Sell @</TableHead>
          <TableHead className="text-right">Sell stock</TableHead>
          <TableHead className="text-right">Load</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="text-right">ROI</TableHead>
          <TableHead className="text-right">Time</TableHead>
          <TableHead className="text-right">SCU</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.map((r, index) => (
          <TableRow
            key={`${r.commodityId}-${r.buy.terminalId}-${r.sell.terminalId}-${index}`}
            className="cursor-pointer hover:bg-muted/40"
            onClick={() => onRowSelect?.(r)}
          >
            <TableCell>
              <div className="font-medium">{r.commodity}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.isIllegal && (
                  <Badge variant="destructive" className="text-[10px]">
                    Illegal
                  </Badge>
                )}
                {r.isVolatileQt && (
                  <Badge variant="outline" className="text-[10px]">
                    Volatile QT
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="font-medium">{r.buy.terminal}</div>
              <div className="text-xs text-muted-foreground">
                {formatPricePerScu(r.buy.price)}/SCU · {r.buy.planet}
                {r.buy.system ? ` · ${r.buy.system}` : ""}
              </div>
            </TableCell>
            <TableCell>
              <div className="font-medium">{r.sell.terminal}</div>
              <div className="text-xs text-muted-foreground">
                {formatPricePerScu(r.sell.price)}/SCU · {r.sell.planet}
                {r.sell.system ? ` · ${r.sell.system}` : ""}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <StockCell stock={r.sell.scuStock ?? r.sell.scu} plannedScu={r.effectiveScu} />
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              <span title={getLoadMethodLabel(r.buy)}>
                <LoadIcon route={r} />
              </span>
            </TableCell>
            <TableCell className="text-right font-medium text-emerald-400 tabular-nums">
              +{formatAuec(r.grossProfit)}
            </TableCell>
            <TableCell className={cn("text-right tabular-nums", roiClassName(r.roiPercent))}>
              {r.roiPercent.toFixed(1)}%
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">
              ≈{r.time.total} min
            </TableCell>
            <TableCell className="text-right tabular-nums">{r.effectiveScu}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, Clock, Copy, Package, Rocket, Store, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormDialogBody } from "@/components/shared/FormDialogBody";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatAuec } from "@/lib/formatAuec";
import { cn } from "@/lib/utils";
import type { RouteLegOffer, SellAlternative, TradingRoute } from "@/types/trading-route";
import {
  buildRouteSummaryText,
  getLoadMethodLabel,
  getStockWarnings,
  getTerminalTagLabels,
  topSellAlternatives,
} from "./route-detail-helpers";

interface RouteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: TradingRoute | null;
  sellAlternatives: SellAlternative[];
  onLogAsIncome?: () => void;
  onStartSession?: () => void;
}

function formatPricePerScu(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function roiClassName(roi: number): string {
  if (roi >= 30) return "text-emerald-400";
  if (roi >= 15) return "text-amber-400/90";
  return "text-muted-foreground";
}

function formatStock(scu: number | undefined, scuStock: number | undefined): string {
  const value = scuStock ?? scu;
  if (value == null || value <= 0) return "Unknown";
  return `${value} SCU`;
}

interface MetricTileProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function MetricTile({ label, value, valueClassName }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", valueClassName)}>{value}</p>
    </div>
  );
}

interface TimeStepProps {
  step: number;
  icon: ReactNode;
  title: string;
  subtitle: string;
  minutes: number;
}

function TimeStep({ step, icon, title, subtitle, minutes }: TimeStepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-xs font-medium text-muted-foreground">
        {step}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium">{title}</span>
          <span className="ml-auto tabular-nums text-muted-foreground">{minutes} min</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

interface TerminalCardProps {
  label: string;
  leg: RouteLegOffer;
  priceLabel: string;
}

function TerminalCard({ label, leg, priceLabel }: TerminalCardProps) {
  const tags = getTerminalTagLabels(leg);

  return (
    <Card className="border-border/60 bg-muted/10">
      <CardContent className="space-y-2 pt-4">
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="font-medium">{leg.terminal}</p>
        <p className="text-xs text-muted-foreground">
          {leg.location}
          {leg.planet || leg.system
            ? ` · ${[leg.planet, leg.system].filter(Boolean).join(" · ")}`
            : ""}
        </p>
        <p className="text-sm tabular-nums">
          {formatPricePerScu(leg.price)} aUEC/SCU
          <span className="text-muted-foreground"> · {priceLabel}</span>
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RouteDetailDialog({
  open,
  onOpenChange,
  route,
  sellAlternatives,
  onLogAsIncome,
  onStartSession,
}: RouteDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!route) return null;

  const activeRoute = route;
  const buyCost = activeRoute.buy.price * activeRoute.effectiveScu;
  const sellRevenue = activeRoute.sell.price * activeRoute.effectiveScu;
  const stockWarnings = getStockWarnings(activeRoute);
  const alternates = topSellAlternatives(activeRoute, sellAlternatives);

  async function handleCopy() {
    const ok = await copyToClipboard(buildRouteSummaryText(activeRoute));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {activeRoute.commodity}
            {activeRoute.isIllegal && (
              <Badge variant="destructive" className="text-[10px]">
                Illegal
              </Badge>
            )}
            {activeRoute.isVolatileQt && (
              <Badge variant="outline" className="text-[10px]">
                Volatile QT
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {activeRoute.buy.terminal} → {activeRoute.sell.terminal}
          </DialogDescription>
        </DialogHeader>

        <FormDialogBody className="space-y-6 px-1">
          <section>
            <SectionHeading title="Overview" className="mb-3" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <MetricTile
                label="Gross profit"
                value={`+${formatAuec(activeRoute.grossProfit)}`}
                valueClassName="text-emerald-400"
              />
              <MetricTile
                label="Profit / min"
                value={`+${formatAuec(activeRoute.profitPerMin)}/min`}
              />
              <MetricTile
                label="ROI"
                value={`${activeRoute.roiPercent.toFixed(1)}%`}
                valueClassName={roiClassName(activeRoute.roiPercent)}
              />
              <MetricTile label="Investment" value={formatAuec(activeRoute.totalCost)} />
              <MetricTile label="SCU" value={String(activeRoute.effectiveScu)} />
              <MetricTile label="Total time" value={`≈${activeRoute.time.total} min`} />
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="text-foreground">Buy cost:</span> {formatAuec(buyCost)}
              </p>
              <p>
                <span className="text-foreground">Sell revenue:</span> {formatAuec(sellRevenue)}
              </p>
              <p>
                <span className="text-foreground">Gross profit:</span>{" "}
                <span className="text-emerald-400">+{formatAuec(activeRoute.grossProfit)}</span>
              </p>
              <p>
                <span className="text-foreground">Profit / SCU:</span>{" "}
                {formatPricePerScu(activeRoute.profitPerScu)} aUEC
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <SectionHeading title="Time breakdown" className="mb-3" />
            <div className="space-y-3">
              <TimeStep
                step={1}
                icon={<Package className="size-4" />}
                title="Loading"
                subtitle={getLoadMethodLabel(activeRoute.buy)}
                minutes={activeRoute.time.load}
              />
              <TimeStep
                step={2}
                icon={<Rocket className="size-4" />}
                title="Quantum travel"
                subtitle={
                  activeRoute.distanceGm > 0
                    ? `${formatPricePerScu(activeRoute.distanceGm)} Gm`
                    : "Estimated"
                }
                minutes={activeRoute.time.qt}
              />
              <TimeStep
                step={3}
                icon={<Store className="size-4" />}
                title="Unload / sell"
                subtitle={getLoadMethodLabel(activeRoute.sell)}
                minutes={activeRoute.time.unload}
              />
              <TimeStep
                step={4}
                icon={<Clock className="size-4" />}
                title="Overhead"
                subtitle="Spawn, takeoff, landing"
                minutes={activeRoute.time.overhead}
              />
            </div>
          </section>

          <Separator />

          <section>
            <SectionHeading title="Terminals" className="mb-3" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TerminalCard
                label="Buy"
                leg={activeRoute.buy}
                priceLabel={`Stock: ${formatStock(activeRoute.buy.scu, activeRoute.buy.scuStock)}`}
              />
              <TerminalCard
                label="Sell"
                leg={activeRoute.sell}
                priceLabel={`Demand: ${formatStock(activeRoute.sell.scu, activeRoute.sell.scuStock)}`}
              />
            </div>
          </section>

          <Separator />

          <section>
            <SectionHeading title="Stock warnings" className="mb-3" />
            {stockWarnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Stock looks sufficient for planned cargo.
              </p>
            ) : (
              <ul className="space-y-2">
                {stockWarnings.map((w) => (
                  <li
                    key={w.message}
                    className={cn(
                      "text-sm",
                      w.severity === "danger" ? "text-destructive" : "text-amber-400/90",
                    )}
                  >
                    {w.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Separator />

          <section>
            <SectionHeading title="Plan B — alternate sell points" className="mb-3" />
            {alternates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other sell terminals in UEX data for this commodity.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Terminal</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Delta</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alternates.map(({ alternative: a, profit, delta }) => (
                    <TableRow key={a.terminalId}>
                      <TableCell>
                        <div className="font-medium">{a.terminal}</div>
                        <div className="text-xs text-muted-foreground">
                          {[a.planet, a.system].filter(Boolean).join(" · ")}
                        </div>
                        {a.hasCargoCenter && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Cargo Center
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPricePerScu(a.price)}/SCU
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          profit > 0 ? "text-emerald-400" : "text-muted-foreground",
                        )}
                      >
                        {profit > 0 ? "+" : ""}
                        {formatAuec(profit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          delta > 0
                            ? "text-emerald-400"
                            : delta < 0
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {delta > 0 ? "+" : ""}
                        {formatAuec(delta)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {a.scu > 0 ? `${a.scu} SCU` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </FormDialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <div className="flex w-full flex-wrap gap-2 sm:mr-auto">
            {onLogAsIncome && (
              <Button type="button" size="sm" onClick={onLogAsIncome}>
                <ArrowUpRight className="size-4" />
                Log as income
              </Button>
            )}
            {onStartSession && (
              <Button type="button" size="sm" variant="outline" onClick={onStartSession}>
                <Timer className="size-4" />
                Start session
              </Button>
            )}
          </div>
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy route summary
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

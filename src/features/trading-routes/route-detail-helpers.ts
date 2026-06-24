import { formatAuec } from "@/lib/formatAuec";
import type {
  RouteLegOffer,
  SellAlternative,
  TradingRoute,
} from "@/types/trading-route";

export type StockWarningSeverity = "warning" | "danger";

export interface StockWarning {
  severity: StockWarningSeverity;
  message: string;
}

export interface AlternateSellRow {
  alternative: SellAlternative;
  profit: number;
  delta: number;
}

function formatPricePerScu(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
}

function formatLocation(leg: RouteLegOffer): string {
  const parts = [leg.planet, leg.system].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : leg.location;
}

export function getLoadMethodLabel(leg: RouteLegOffer): string {
  if (leg.hasCargoCenter) return "Cargo Center (auto)";
  if (leg.hasLoadingDock) return "Loading Dock";
  if (leg.hasFreightElevator) return "Freight Elevator";
  return "Manual";
}

export function getStockWarnings(route: TradingRoute): StockWarning[] {
  const warnings: StockWarning[] = [];
  const buyStock = route.buy.scuStock ?? route.buy.scu;
  const sellStock = route.sell.scuStock ?? route.sell.scu;

  if (sellStock > 0 && sellStock < route.effectiveScu) {
    warnings.push({
      severity: "danger",
      message: `Low sell demand — only ${sellStock} SCU available (planned ${route.effectiveScu} SCU)`,
    });
  }

  if (buyStock > 0 && buyStock < route.effectiveScu) {
    warnings.push({
      severity: "warning",
      message: `Limited buy stock — ${buyStock} SCU available (planned ${route.effectiveScu} SCU)`,
    });
  }

  if (
    route.sell.scuStock != null &&
    route.sell.scuStock > 0 &&
    route.sell.scuStock < route.effectiveScu * 0.5
  ) {
    warnings.push({
      severity: "warning",
      message: "Sell terminal demand is very low — you may not fill cargo at this price",
    });
  }

  return warnings;
}

export function topSellAlternatives(
  route: TradingRoute,
  alts: SellAlternative[],
  limit = 3,
): AlternateSellRow[] {
  return alts
    .filter((a) => a.terminalId !== route.sell.terminalId)
    .map((alternative) => {
      const profit = (alternative.price - route.buy.price) * route.effectiveScu;
      const delta = profit - route.grossProfit;
      return { alternative, profit, delta };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, limit);
}

export function buildRouteSummaryText(route: TradingRoute): string {
  const buyLoc = formatLocation(route.buy);
  const sellLoc = formatLocation(route.sell);
  const buyCost = route.buy.price * route.effectiveScu;
  const sellRevenue = route.sell.price * route.effectiveScu;

  const lines = [
    `${route.commodity}${route.isIllegal ? " (Illegal)" : ""}${route.isVolatileQt ? " (Volatile QT)" : ""}`,
    "",
    `Buy: ${route.buy.terminal} — ${formatPricePerScu(route.buy.price)} aUEC/SCU`,
    `     ${buyLoc}`,
    "",
    `Sell: ${route.sell.terminal} — ${formatPricePerScu(route.sell.price)} aUEC/SCU`,
    `      ${sellLoc}`,
    "",
    `Profit: +${formatAuec(route.grossProfit)}`,
    `ROI: ${route.roiPercent.toFixed(1)}%`,
    `Profit/min: +${formatAuec(route.profitPerMin)}/min`,
    `Investment: ${formatAuec(route.totalCost)}`,
    `SCU: ${route.effectiveScu}`,
    `Profit/SCU: ${formatPricePerScu(route.profitPerScu)} aUEC`,
    "",
    `Buy cost: ${formatAuec(buyCost)}`,
    `Sell revenue: ${formatAuec(sellRevenue)}`,
    "",
    `Time: ~${route.time.total} min (Load ${route.time.load} · QT ${route.time.qt} · Unload ${route.time.unload} · Overhead ${route.time.overhead})`,
    route.distanceGm > 0 ? `Distance: ${formatPricePerScu(route.distanceGm)} Gm` : "Distance: estimated",
  ];

  return lines.join("\n");
}

export function getTerminalTagLabels(leg: RouteLegOffer): string[] {
  const tags: string[] = [];
  if (leg.hasCargoCenter) tags.push("Cargo Center");
  if (leg.hasFreightElevator) tags.push("Freight Elevator");
  if (leg.hasLoadingDock) tags.push("Loading Dock");
  if (leg.isRefuel) tags.push("Refuel");
  if (leg.isNqa) tags.push("NQA");
  if (leg.maxContainerSize > 0) tags.push(`Max ${leg.maxContainerSize} SCU`);
  return tags;
}

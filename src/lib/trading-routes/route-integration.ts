import type { FarmingSessionFormDefaults } from "@/features/sessions/FarmingSessionFormDialog";
import type { TransactionFormDefaults } from "@/features/transactions/TransactionFormDialog";
import { buildLoopChecklistText, loopHopCount } from "@/features/trading-routes/loop-checklist";
import { formatAuec } from "@/lib/formatAuec";
import { toDateInputValue } from "@/lib/formatTransactionDate";
import type { TradeLoop, TradingRoute } from "@/types/trading-route";

export type LogProfitBasis = "gross" | "net";

export interface RouteIntegrationOptions {
  logProfitBasis?: LogProfitBasis;
  operatingCostAuec?: number;
  shipName?: string;
}

export function buildRouteNote(route: TradingRoute): string {
  return `Buy ${route.commodity} @ ${route.buy.terminal} → Sell @ ${route.sell.terminal}`;
}

export function buildRouteTitle(route: TradingRoute): string {
  return `${route.commodity} — ${route.buy.terminal} → ${route.sell.terminal}`;
}

export function buildRouteLocation(route: TradingRoute): string {
  if (route.buy.system && route.sell.system) {
    return `${route.buy.system} → ${route.sell.system}`;
  }
  return route.sell.terminal;
}

export function getRouteLogAmount(
  route: TradingRoute,
  basis: LogProfitBasis = "gross",
  operatingCostAuec = 0,
): number {
  if (basis === "gross") return Math.round(route.grossProfit);
  return Math.max(0, Math.round(route.grossProfit - operatingCostAuec));
}

export interface RouteTransactionFormDefaults {
  type: "income";
  category: string;
  amount: string;
  title: string;
  description: string;
  activityType: string;
  shipUsed: string;
  location: string;
  date: string;
}

export function buildRouteTransactionDefaults(
  route: TradingRoute,
  options: RouteIntegrationOptions = {},
): RouteTransactionFormDefaults {
  const basis = options.logProfitBasis ?? "gross";
  const amount = getRouteLogAmount(route, basis, options.operatingCostAuec ?? 0);

  return {
    type: "income",
    category: "Trading",
    amount: String(amount),
    title: buildRouteTitle(route),
    description: buildRouteNote(route),
    activityType: "Trading",
    shipUsed: options.shipName ?? "",
    location: buildRouteLocation(route),
    date: toDateInputValue(new Date().toISOString()),
  };
}

export interface RouteSessionFormDefaults {
  title: string;
  activityType: "Trading";
  shipUsed: string;
  startBalance: string;
  endBalance: string;
  expenses: string;
  durationMinutes: string;
  location: string;
  notes: string;
}

export function buildRouteSessionDefaults(
  route: TradingRoute,
  options: Pick<RouteIntegrationOptions, "shipName"> = {},
): RouteSessionFormDefaults {
  const note = buildRouteNote(route);
  const profitHint = `Est. gross: +${formatAuec(route.grossProfit)}`;

  return {
    title: buildRouteTitle(route),
    activityType: "Trading",
    shipUsed: options.shipName ?? "",
    startBalance: "",
    endBalance: "",
    expenses: "",
    durationMinutes: String(route.time.total),
    location: buildRouteLocation(route),
    notes: `${note}\n${profitHint}`,
  };
}

export function buildLoopCommodityLabel(loop: TradeLoop): string {
  if (loop.commoditiesUsed.length === 1) return loop.commoditiesUsed[0];
  if (loop.commoditiesUsed.length > 1) return "Mixed commodities";
  return "Trading loop";
}

export function buildLoopTitle(loop: TradeLoop): string {
  const hops = loopHopCount(loop);
  return `${buildLoopCommodityLabel(loop)} — ${hops}-leg loop`;
}

export function buildLoopLocation(loop: TradeLoop): string {
  if (loop.systemsVisited.length > 0) {
    return loop.systemsVisited.join(" → ");
  }
  const terminals = loop.legs.map((leg) => leg.terminal.terminal);
  if (terminals.length === 0) return "";
  if (terminals.length <= 2) return terminals.join(" → ");
  return `${terminals[0]} → … → ${terminals[terminals.length - 1]}`;
}

export function buildLoopTransactionDefaults(
  loop: TradeLoop,
  options: Pick<RouteIntegrationOptions, "shipName"> = {},
): TransactionFormDefaults {
  return {
    type: "income",
    category: "Trading",
    amount: String(Math.round(loop.totalProfit)),
    title: buildLoopTitle(loop),
    description: buildLoopChecklistText(loop),
    activityType: "Trading",
    shipUsed: options.shipName ?? "",
    location: buildLoopLocation(loop),
    date: toDateInputValue(new Date().toISOString()),
  };
}

export function buildLoopSessionDefaults(
  loop: TradeLoop,
  options: Pick<RouteIntegrationOptions, "shipName"> = {},
): FarmingSessionFormDefaults {
  return {
    title: buildLoopTitle(loop),
    activityType: "Trading",
    shipUsed: options.shipName ?? "",
    startBalance: "",
    endBalance: "",
    expenses: "",
    durationMinutes: String(loop.totalTime),
    location: buildLoopLocation(loop),
    notes: buildLoopChecklistText(loop),
  };
}

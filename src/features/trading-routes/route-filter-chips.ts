import type { LoopPlannerFilters } from "@/types/trading-route";
import type { TradingRouteFilters } from "@/types/trading-route";
import type { ActiveFilterChip } from "./ActiveFilterChips";

export function buildRouteFilterChips(
  filters: TradingRouteFilters,
  onPatch: (patch: Partial<TradingRouteFilters>) => void,
): { chips: ActiveFilterChip[]; remove: (id: string) => void } {
  const chips: ActiveFilterChip[] = [];

  if (filters.system?.trim()) chips.push({ id: "system", label: `System: ${filters.system}` });
  if (filters.buySystem?.trim()) chips.push({ id: "buySystem", label: `Buy: ${filters.buySystem}` });
  if (filters.sellSystem?.trim()) chips.push({ id: "sellSystem", label: `Sell: ${filters.sellSystem}` });
  if (filters.commodity?.trim()) chips.push({ id: "commodity", label: filters.commodity });
  if (filters.legality === "legal") chips.push({ id: "legality", label: "Legal only" });
  if (filters.legality === "illegal") chips.push({ id: "legality", label: "Illegal only" });
  if (filters.sameSystem === "yes") chips.push({ id: "sameSystem", label: "Same system" });
  if (filters.cargoCenter === "both") chips.push({ id: "cargoCenter", label: "Cargo center both" });
  if (filters.cargoCenter === "buy") chips.push({ id: "cargoCenter", label: "Cargo center buy" });
  if (filters.cargoCenter === "sell") chips.push({ id: "cargoCenter", label: "Cargo center sell" });
  if (filters.autoloadOnly) chips.push({ id: "autoloadOnly", label: "Autoload" });
  if (filters.excludeVolatileQt) chips.push({ id: "excludeVolatileQt", label: "No volatile QT" });
  if (filters.minStock != null && filters.minStock > 0) {
    chips.push({ id: "minStock", label: `Min demand ${filters.minStock} SCU` });
  }
  if (filters.minSellStock != null && filters.minSellStock > 0) {
    chips.push({ id: "minSellStock", label: `Min stock ${filters.minSellStock} SCU` });
  }
  if (filters.minContainerSize != null && filters.minContainerSize > 0) {
    chips.push({ id: "minContainerSize", label: `Box ≥ ${filters.minContainerSize} SCU` });
  }
  if (filters.query?.trim()) chips.push({ id: "query", label: `“${filters.query.trim()}”` });

  function remove(id: string) {
    const patch: Partial<TradingRouteFilters> = {};
    switch (id) {
      case "system":
        patch.system = "";
        break;
      case "buySystem":
        patch.buySystem = "";
        break;
      case "sellSystem":
        patch.sellSystem = "";
        break;
      case "commodity":
        patch.commodity = "";
        break;
      case "legality":
        patch.legality = "all";
        break;
      case "sameSystem":
        patch.sameSystem = "all";
        break;
      case "cargoCenter":
        patch.cargoCenter = "all";
        break;
      case "autoloadOnly":
        patch.autoloadOnly = false;
        break;
      case "excludeVolatileQt":
        patch.excludeVolatileQt = false;
        break;
      case "minStock":
        patch.minStock = undefined;
        break;
      case "minSellStock":
        patch.minSellStock = undefined;
        break;
      case "minContainerSize":
        patch.minContainerSize = undefined;
        break;
      case "query":
        patch.query = "";
        break;
      default:
        return;
    }
    onPatch(patch);
  }

  return { chips, remove };
}

export function buildLoopFilterChips(
  filters: LoopPlannerFilters,
  onPatch: (patch: Partial<LoopPlannerFilters>) => void,
  plannerContext?: { shipName?: string; cargoScu?: number },
): { chips: ActiveFilterChip[]; remove: (id: string) => void } {
  const chips: ActiveFilterChip[] = [];

  if (plannerContext?.shipName?.trim()) {
    chips.push({ id: "ship", label: plannerContext.shipName });
  } else if (plannerContext?.cargoScu != null && plannerContext.cargoScu !== 46) {
    chips.push({ id: "cargo", label: `${plannerContext.cargoScu} SCU` });
  }

  if (filters.query?.trim()) chips.push({ id: "query", label: `“${filters.query.trim()}”` });
  if (filters.commodity?.trim()) chips.push({ id: "commodity", label: filters.commodity });
  if (filters.system?.trim()) chips.push({ id: "system", label: filters.system });
  if (filters.terminal?.trim()) chips.push({ id: "terminal", label: filters.terminal });
  if (filters.minProfit != null && filters.minProfit > 0) {
    chips.push({ id: "minProfit", label: `Profit ≥ ${filters.minProfit}` });
  }
  if (filters.maxTime != null && filters.maxTime > 0) {
    chips.push({ id: "maxTime", label: `Time ≤ ${filters.maxTime}m` });
  }

  function remove(id: string) {
    const patch: Partial<LoopPlannerFilters> = {};
    switch (id) {
      case "query":
        patch.query = "";
        break;
      case "commodity":
        patch.commodity = "";
        break;
      case "system":
        patch.system = "";
        break;
      case "terminal":
        patch.terminal = "";
        break;
      case "minProfit":
        patch.minProfit = undefined;
        break;
      case "maxTime":
        patch.maxTime = undefined;
        break;
      case "ship":
      case "cargo":
        return;
      default:
        return;
    }
    onPatch(patch);
  }

  return { chips, remove };
}

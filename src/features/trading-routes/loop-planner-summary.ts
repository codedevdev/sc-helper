import { DEFAULT_LOOP_PLANNER_INPUT } from "@/features/trading-routes/default-loop-planner";
import { isStantonOnly } from "@/features/trading-routes/loop-planner-presets";
import { systemFilterSummary } from "@/lib/trading-routes/loop-system-filter";
import type { LoopPlannerInput } from "@/types/trading-route";

export interface LoopPlannerSummaryOptions {
  stantonSystemId?: number;
  systemNames?: Map<number, string>;
}

export function buildLoopPlannerSummary(
  planner: LoopPlannerInput,
  options: LoopPlannerSummaryOptions = {},
): string | undefined {
  const parts: string[] = [];

  if (planner.budgetAuec !== DEFAULT_LOOP_PLANNER_INPUT.budgetAuec) {
    parts.push(`${(planner.budgetAuec / 1000).toFixed(0)}k budget`);
  }
  if (planner.crew !== DEFAULT_LOOP_PLANNER_INPUT.crew) {
    parts.push(`${planner.crew} crew`);
  }
  if (planner.startTerminalId != null) {
    parts.push("Start terminal");
  }
  if (planner.maxTotalTimeMinutes != null && planner.maxTotalTimeMinutes > 0) {
    parts.push(`≤${planner.maxTotalTimeMinutes}m search`);
  }

  const mode = planner.systemFilterMode ?? "all";
  if (mode !== "all" && !isStantonOnly(planner, options.stantonSystemId)) {
    const names = options.systemNames ?? new Map<number, string>();
    parts.push(systemFilterSummary(planner, names));
  }

  if (!(planner.returnToStart ?? DEFAULT_LOOP_PLANNER_INPUT.returnToStart)) {
    parts.push("Open loop");
  }
  if (!(planner.allowMixedCommodities ?? DEFAULT_LOOP_PLANNER_INPUT.allowMixedCommodities)) {
    parts.push("Single commodity");
  }
  if (planner.requireCargoCenter) {
    parts.push("Cargo center");
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

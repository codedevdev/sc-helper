import type { TransitionEdge, TransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import type { LoopPlannerInput } from "@/types/trading-route";

export type SystemFilterMode = "all" | "allow" | "exclude";

function normalizeMode(planner: LoopPlannerInput): SystemFilterMode {
  return planner.systemFilterMode ?? "all";
}

function allowedSet(planner: LoopPlannerInput): Set<number> {
  return new Set(planner.allowedSystemIds ?? []);
}

function excludedSet(planner: LoopPlannerInput): Set<number> {
  return new Set(planner.excludedSystemIds ?? []);
}

export function isSystemAllowed(systemId: number, planner: LoopPlannerInput): boolean {
  if (systemId <= 0) return true;

  const mode = normalizeMode(planner);
  if (mode === "allow") {
    const allowed = allowedSet(planner);
    return allowed.size === 0 || allowed.has(systemId);
  }
  if (mode === "exclude") {
    const excluded = excludedSet(planner);
    return !excluded.has(systemId);
  }
  return true;
}

export function isEdgeAllowed(edge: TransitionEdge, planner: LoopPlannerInput): boolean {
  return (
    isSystemAllowed(edge.buyOffer.systemId, planner) &&
    isSystemAllowed(edge.sellOffer.systemId, planner)
  );
}

export function isTerminalAllowed(systemId: number, planner: LoopPlannerInput): boolean {
  return isSystemAllowed(systemId, planner);
}

export function filterGraphBySystems(
  graph: TransitionGraph,
  planner: LoopPlannerInput,
): TransitionGraph {
  const mode = normalizeMode(planner);
  if (mode === "all") return graph;

  const edges = graph.edges.filter((edge) => isEdgeAllowed(edge, planner));
  const nodeIds = new Set<number>();
  for (const edge of edges) {
    nodeIds.add(edge.fromTerminalId);
    nodeIds.add(edge.toTerminalId);
  }

  const nodes: TransitionGraph["nodes"] = {};
  for (const id of nodeIds) {
    const node = graph.nodes[id];
    if (node) nodes[id] = node;
  }

  return { nodes, edges };
}

export function systemFilterSummary(
  planner: LoopPlannerInput,
  systemNames: Map<number, string>,
): string {
  const mode = normalizeMode(planner);
  if (mode === "all") return "All systems";

  const ids = mode === "allow" ? planner.allowedSystemIds ?? [] : planner.excludedSystemIds ?? [];
  if (ids.length === 0) {
    return mode === "allow" ? "Only selected systems (none chosen)" : "All systems";
  }

  const names = ids.map((id) => systemNames.get(id) ?? `System ${id}`);
  if (mode === "allow") {
    return names.length <= 2 ? `Only ${names.join(", ")}` : `Only ${names.length} systems`;
  }
  return names.length <= 2 ? `${names.join(", ")} excluded` : `${names.length} systems excluded`;
}

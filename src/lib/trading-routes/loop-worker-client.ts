import { buildTransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import { HEAVY_LOOP_EDGE_THRESHOLD } from "@/lib/trading-routes/constants";
import {
  searchLoopsWithMeta,
  type SearchLoopsOptions,
  type SearchLoopsResult,
} from "@/lib/trading-routes/search-loops";
import { getTradingRoutesWorker } from "@/lib/trading-routes/worker-client";
import type { OrbitDistanceMap, UexMarketData } from "@/lib/uex/types";
import type { LoopPlannerInput } from "@/types/trading-route";

const WORKER_TIMEOUT_MS = 120_000;

let nextRequestId = 1;

function runWorkerSearchLoops(
  market: UexMarketData,
  planner: LoopPlannerInput,
  orbitDistances: OrbitDistanceMap,
  options: SearchLoopsOptions,
  signal?: AbortSignal,
): Promise<SearchLoopsResult> {
  const worker = getTradingRoutesWorker();
  if (!worker) {
    const graph = buildTransitionGraph(market, planner, orbitDistances);
    return Promise.resolve(searchLoopsWithMeta(graph, planner, { ...options, orbitDistances }));
  }

  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Loop search timed out"));
    }, WORKER_TIMEOUT_MS);

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      signal?.removeEventListener("abort", onAbort);
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type: string;
        id: number;
        loops?: SearchLoopsResult["loops"];
        truncated?: boolean;
        exploredNodes?: number;
        message?: string;
      };
      if (data.id !== id) return;
      cleanup();
      if (data.type === "error") {
        reject(new Error(data.message ?? "Worker loop search failed"));
        return;
      }
      if (data.type === "search-loops" && data.loops) {
        resolve({
          loops: data.loops,
          truncated: data.truncated ?? false,
          exploredNodes: data.exploredNodes ?? 0,
        });
      }
    };

    worker.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    worker.postMessage({
      type: "search-loops",
      id,
      prices: market.prices,
      terminals: market.terminals,
      commodities: market.commodities,
      planner,
      orbitDistances,
      options,
    });
  });
}

export async function searchLoopsFromMarket(
  market: UexMarketData,
  planner: LoopPlannerInput,
  orbitDistances: OrbitDistanceMap = {},
  options: SearchLoopsOptions = {},
  signal?: AbortSignal,
): Promise<SearchLoopsResult> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const graph = buildTransitionGraph(market, planner, orbitDistances);

  if (graph.edges.length > HEAVY_LOOP_EDGE_THRESHOLD) {
    try {
      return await runWorkerSearchLoops(market, planner, orbitDistances, options, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      return searchLoopsWithMeta(graph, planner, { ...options, orbitDistances });
    }
  }

  return searchLoopsWithMeta(graph, planner, { ...options, orbitDistances });
}

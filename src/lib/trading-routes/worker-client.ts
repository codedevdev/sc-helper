import { buildLoopRoutes } from "@/lib/trading-routes/build-loop-routes";
import { buildTradingRoutesFromMarketData } from "@/lib/uex/market-snapshot";
import { applyPlannerToCandidates } from "@/lib/uex/calculate-metrics";
import { candidateToTradingRoute } from "@/lib/trading-routes/calculate-metrics";
import {
  applySearchParamsToLoopCandidates,
  candidateToTradingLoopRoute,
} from "@/lib/trading-routes/calculate-loop-metrics";
import { HEAVY_CANDIDATE_THRESHOLD } from "@/lib/trading-routes/constants";
import { plannerToSearchParams } from "@/lib/trading-routes/types";
import type { OrbitDistanceMap, UexMarketData } from "@/lib/uex/types";
import type {
  SellAlternative,
  TradingLoopCandidate,
  TradingLoopRoute,
  TradingRoute,
  TradingRouteCandidate,
  TradingRoutePlannerInput,
} from "@/types/trading-route";

import TradingRoutesWorker from "@/workers/trading-routes.worker?worker";

const WORKER_TIMEOUT_MS = 120_000;
const CHUNK_SIZE = 500;

let workerInstance: Worker | null = null;
let nextRequestId = 1;

function getWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  try {
    if (!workerInstance) {
      workerInstance = new TradingRoutesWorker();
    }
    return workerInstance;
  } catch {
    return null;
  }
}

/** Shared worker singleton for trading-routes and loop-planner clients. */
export function getTradingRoutesWorker(): Worker | null {
  return getWorker();
}

function isHeavy(pricesLen: number, candidatesLen?: number): boolean {
  return (
    pricesLen >= HEAVY_CANDIDATE_THRESHOLD ||
    (candidatesLen ?? 0) >= HEAVY_CANDIDATE_THRESHOLD
  );
}

function runWorkerBuild(
  market: UexMarketData,
  signal?: AbortSignal,
): Promise<{
  candidates: TradingRouteCandidate[];
  sellAlternatives: Record<number, SellAlternative[]>;
}> {
  const worker = getWorker();
  if (!worker) {
    return Promise.resolve(buildTradingRoutesFromMarketData(market));
  }

  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Route build timed out"));
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
        candidates?: TradingRouteCandidate[];
        sellAlternatives?: Record<number, SellAlternative[]>;
        message?: string;
      };
      if (data.id !== id) return;
      cleanup();
      if (data.type === "error") {
        reject(new Error(data.message ?? "Worker build failed"));
        return;
      }
      if (data.type === "build" && data.candidates && data.sellAlternatives) {
        resolve({ candidates: data.candidates, sellAlternatives: data.sellAlternatives });
      }
    };

    worker.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    worker.postMessage({
      type: "build",
      id,
      prices: market.prices,
      terminals: market.terminals,
      commodities: market.commodities,
    });
  });
}

function runWorkerScore(
  candidates: TradingRouteCandidate[],
  planner: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName: string,
  signal?: AbortSignal,
): Promise<TradingRoute[]> {
  const worker = getWorker();
  if (!worker) {
    return applySearchParamsChunked(candidates, planner, orbitDistances, shipName, signal);
  }

  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Route scoring timed out"));
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
        routes?: TradingRoute[];
        message?: string;
      };
      if (data.id !== id) return;
      cleanup();
      if (data.type === "error") {
        reject(new Error(data.message ?? "Worker score failed"));
        return;
      }
      if (data.type === "score" && data.routes) {
        resolve(data.routes);
      }
    };

    worker.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    worker.postMessage({
      type: "score",
      id,
      candidates,
      planner,
      orbitDistances,
      shipName,
    });
  });
}

export async function applySearchParamsChunked(
  candidates: TradingRouteCandidate[],
  planner: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName: string,
  signal?: AbortSignal,
): Promise<TradingRoute[]> {
  const params = plannerToSearchParams(planner, shipName || undefined);
  const routes: TradingRoute[] = [];

  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const batch = candidates.slice(i, i + CHUNK_SIZE);
    for (const candidate of batch) {
      const route = candidateToTradingRoute(candidate, params, orbitDistances);
      if (route) routes.push(route);
    }
  }

  return routes;
}

export async function buildRouteSnapshotFromMarket(
  market: UexMarketData,
  signal?: AbortSignal,
): Promise<{
  candidates: TradingRouteCandidate[];
  sellAlternatives: Record<number, SellAlternative[]>;
  fetchedAt: string;
}> {
  if (isHeavy(market.prices.length)) {
    const built = await runWorkerBuild(market, signal);
    return { ...built, fetchedAt: market.fetchedAt };
  }

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const built = buildTradingRoutesFromMarketData(market);
  return {
    candidates: built.candidates,
    sellAlternatives: built.sellAlternatives,
    fetchedAt: built.fetchedAt,
  };
}

export async function scoreRouteCandidates(
  candidates: TradingRouteCandidate[],
  planner: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName: string,
  signal?: AbortSignal,
): Promise<TradingRoute[]> {
  if (isHeavy(0, candidates.length)) {
    try {
      return await runWorkerScore(candidates, planner, orbitDistances, shipName, signal);
    } catch {
      return applySearchParamsChunked(candidates, planner, orbitDistances, shipName, signal);
    }
  }

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return applyPlannerToCandidates(candidates, planner, orbitDistances, shipName);
}

export function terminateTradingRoutesWorker(): void {
  workerInstance?.terminate();
  workerInstance = null;
}

function runWorkerBuildLoops(
  market: UexMarketData,
  signal?: AbortSignal,
): Promise<{ candidates: TradingLoopCandidate[] }> {
  const worker = getWorker();
  if (!worker) {
    const built = buildLoopRoutes(market);
    return Promise.resolve({ candidates: built.candidates });
  }

  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Loop build timed out"));
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
        candidates?: TradingLoopCandidate[];
        message?: string;
      };
      if (data.id !== id) return;
      cleanup();
      if (data.type === "error") {
        reject(new Error(data.message ?? "Worker loop build failed"));
        return;
      }
      if (data.type === "buildLoops" && data.candidates) {
        resolve({ candidates: data.candidates });
      }
    };

    worker.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    worker.postMessage({
      type: "buildLoops",
      id,
      prices: market.prices,
      terminals: market.terminals,
      commodities: market.commodities,
    });
  });
}

function runWorkerScoreLoops(
  candidates: TradingLoopCandidate[],
  planner: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName: string,
  signal?: AbortSignal,
): Promise<TradingLoopRoute[]> {
  const worker = getWorker();
  if (!worker) {
    return applyLoopSearchParamsChunked(candidates, planner, orbitDistances, shipName, signal);
  }

  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Loop scoring timed out"));
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
        routes?: TradingLoopRoute[];
        message?: string;
      };
      if (data.id !== id) return;
      cleanup();
      if (data.type === "error") {
        reject(new Error(data.message ?? "Worker loop score failed"));
        return;
      }
      if (data.type === "scoreLoops" && data.routes) {
        resolve(data.routes);
      }
    };

    worker.addEventListener("message", onMessage);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    worker.postMessage({
      type: "scoreLoops",
      id,
      candidates,
      planner,
      orbitDistances,
      shipName,
    });
  });
}

export async function applyLoopSearchParamsChunked(
  candidates: TradingLoopCandidate[],
  planner: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName: string,
  signal?: AbortSignal,
): Promise<TradingLoopRoute[]> {
  const params = plannerToSearchParams(planner, shipName || undefined);
  const routes: TradingLoopRoute[] = [];

  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const batch = candidates.slice(i, i + CHUNK_SIZE);
    for (const candidate of batch) {
      const route = candidateToTradingLoopRoute(candidate, params, orbitDistances);
      if (route) routes.push(route);
    }
  }

  return routes;
}

export async function buildLoopSnapshotFromMarket(
  market: UexMarketData,
  signal?: AbortSignal,
): Promise<{ candidates: TradingLoopCandidate[]; fetchedAt: string }> {
  if (isHeavy(market.prices.length)) {
    const built = await runWorkerBuildLoops(market, signal);
    return { ...built, fetchedAt: market.fetchedAt };
  }

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const built = buildLoopRoutes(market);
  return { candidates: built.candidates, fetchedAt: market.fetchedAt };
}

export async function scoreLoopCandidates(
  candidates: TradingLoopCandidate[],
  planner: TradingRoutePlannerInput,
  orbitDistances: OrbitDistanceMap,
  shipName: string,
  signal?: AbortSignal,
): Promise<TradingLoopRoute[]> {
  if (isHeavy(0, candidates.length)) {
    try {
      return await runWorkerScoreLoops(candidates, planner, orbitDistances, shipName, signal);
    } catch {
      return applyLoopSearchParamsChunked(candidates, planner, orbitDistances, shipName, signal);
    }
  }

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const params = plannerToSearchParams(planner, shipName || undefined);
  return applySearchParamsToLoopCandidates(candidates, params, orbitDistances);
}

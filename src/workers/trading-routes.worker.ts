import { buildTradePairsFromArrays } from "@/lib/trading-routes/build-trade-pairs";
import { buildTransitionGraph } from "@/lib/trading-routes/build-transition-graph";
import { buildLoopRoutesFromArrays } from "@/lib/trading-routes/build-loop-routes";
import { applySearchParamsToCandidates } from "@/lib/trading-routes/calculate-metrics";
import { applySearchParamsToLoopCandidates } from "@/lib/trading-routes/calculate-loop-metrics";
import { searchLoopsWithMeta, type SearchLoopsOptions } from "@/lib/trading-routes/search-loops";
import { plannerToSearchParams } from "@/lib/trading-routes/types";
import type { OrbitDistanceMap, UexMarketData } from "@/lib/uex/types";
import type {
  LoopPlannerInput,
  TradeLoop,
  TradingLoopCandidate,
  TradingLoopRoute,
  TradingRoute,
  TradingRoutePlannerInput,
} from "@/types/trading-route";
import type { SellAlternative, TradingRouteCandidate } from "@/types/trading-route";

type BuildMessage = {
  type: "build";
  id: number;
  prices: UexMarketData["prices"];
  terminals: UexMarketData["terminals"];
  commodities: UexMarketData["commodities"];
};

type BuildLoopsMessage = {
  type: "buildLoops";
  id: number;
  prices: UexMarketData["prices"];
  terminals: UexMarketData["terminals"];
  commodities: UexMarketData["commodities"];
};

type ScoreMessage = {
  type: "score";
  id: number;
  candidates: TradingRouteCandidate[];
  planner: TradingRoutePlannerInput;
  orbitDistances: OrbitDistanceMap;
  shipName: string;
};

type ScoreLoopsMessage = {
  type: "scoreLoops";
  id: number;
  candidates: TradingLoopCandidate[];
  planner: TradingRoutePlannerInput;
  orbitDistances: OrbitDistanceMap;
  shipName: string;
};

type SearchLoopsMessage = {
  type: "search-loops";
  id: number;
  prices: UexMarketData["prices"];
  terminals: UexMarketData["terminals"];
  commodities: UexMarketData["commodities"];
  planner: LoopPlannerInput;
  orbitDistances: OrbitDistanceMap;
  options?: SearchLoopsOptions;
};

type WorkerRequest =
  | BuildMessage
  | BuildLoopsMessage
  | ScoreMessage
  | ScoreLoopsMessage
  | SearchLoopsMessage;

type BuildResult = {
  type: "build";
  id: number;
  candidates: TradingRouteCandidate[];
  sellAlternatives: Record<number, SellAlternative[]>;
};

type BuildLoopsResult = {
  type: "buildLoops";
  id: number;
  candidates: TradingLoopCandidate[];
};

type ScoreResult = {
  type: "score";
  id: number;
  routes: TradingRoute[];
};

type ScoreLoopsResult = {
  type: "scoreLoops";
  id: number;
  routes: TradingLoopRoute[];
};

type SearchLoopsResult = {
  type: "search-loops";
  id: number;
  loops: TradeLoop[];
  truncated: boolean;
  exploredNodes: number;
};

type ErrorResult = {
  type: "error";
  id: number;
  message: string;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === "build") {
      const { candidates, sellAlternatives } = buildTradePairsFromArrays(
        msg.prices,
        msg.terminals,
        msg.commodities,
      );
      const result: BuildResult = {
        type: "build",
        id: msg.id,
        candidates,
        sellAlternatives,
      };
      self.postMessage(result);
      return;
    }

    if (msg.type === "buildLoops") {
      const { candidates } = buildLoopRoutesFromArrays(
        msg.prices,
        msg.terminals,
        msg.commodities,
      );
      const result: BuildLoopsResult = {
        type: "buildLoops",
        id: msg.id,
        candidates,
      };
      self.postMessage(result);
      return;
    }

    if (msg.type === "score") {
      const params = plannerToSearchParams(msg.planner, msg.shipName || undefined);
      const routes = applySearchParamsToCandidates(
        msg.candidates,
        params,
        msg.orbitDistances,
      );
      const result: ScoreResult = { type: "score", id: msg.id, routes };
      self.postMessage(result);
      return;
    }

    if (msg.type === "scoreLoops") {
      const params = plannerToSearchParams(msg.planner, msg.shipName || undefined);
      const routes = applySearchParamsToLoopCandidates(
        msg.candidates,
        params,
        msg.orbitDistances,
      );
      const result: ScoreLoopsResult = { type: "scoreLoops", id: msg.id, routes };
      self.postMessage(result);
      return;
    }

    if (msg.type === "search-loops") {
      const graph = buildTransitionGraph(
        {
          prices: msg.prices,
          terminals: msg.terminals,
          commodities: msg.commodities,
        },
        msg.planner,
        msg.orbitDistances,
      );
      const { loops, truncated, exploredNodes } = searchLoopsWithMeta(graph, msg.planner, {
        ...msg.options,
        orbitDistances: msg.orbitDistances,
      });
      const result: SearchLoopsResult = {
        type: "search-loops",
        id: msg.id,
        loops,
        truncated,
        exploredNodes,
      };
      self.postMessage(result);
    }
  } catch (e) {
    const err: ErrorResult = {
      type: "error",
      id: msg.id,
      message: e instanceof Error ? e.message : "Worker error",
    };
    self.postMessage(err);
  }
};

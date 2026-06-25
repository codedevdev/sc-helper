import type { TransitionEdge } from "@/lib/trading-routes/build-transition-graph";
import { computeScuUsed } from "@/lib/trading-routes/calculate-metrics";
import { estimateTravelTime } from "@/lib/trading-routes/estimate-travel-time";
import type { OrbitDistanceMap, TravelTimeLeg, TravelTimeOptions } from "@/lib/trading-routes/types";
import type { LoopPlannerInput, RouteTimeEstimate, TradeLeg } from "@/types/trading-route";

export interface LoopState {
  currentTerminalId: number;
  budgetAuec: number;
  cargoScu: number;
  cargoCommodityId?: number;
  legsCompleted: TradeLeg[];
  totalProfit: number;
  totalTimeMinutes: number;
}

export function resolveCargoScu(planner: LoopPlannerInput): number {
  const cargo = planner.cargoScu;
  if (planner.shipScu != null && planner.shipScu > 0) {
    return Math.min(cargo, planner.shipScu);
  }
  return cargo;
}

function resolveScuUsed(
  edge: TransitionEdge,
  state: LoopState,
  planner: LoopPlannerInput,
): number {
  return computeScuUsed(edge.buyOffer.price, edge.buyOffer.scu, edge.sellOffer.scu, {
    cargoScu: resolveCargoScu(planner),
    budgetAuec: state.budgetAuec,
    crew: planner.crew ?? 1,
  });
}

export function createInitialState(startTerminalId: number, budgetAuec: number): LoopState {
  return {
    currentTerminalId: startTerminalId,
    budgetAuec,
    cargoScu: 0,
    cargoCommodityId: undefined,
    legsCompleted: [],
    totalProfit: 0,
    totalTimeMinutes: 0,
  };
}

export function canExecuteLeg(
  state: LoopState,
  edge: TransitionEdge,
  planner: LoopPlannerInput,
): boolean {
  if (state.cargoScu !== 0) return false;
  if (state.currentTerminalId !== edge.fromTerminalId) return false;
  if (planner.excludeIllegal && edge.isIllegal) return false;

  const scuUsed = resolveScuUsed(edge, state, planner);
  if (scuUsed <= 0) return false;

  const buyCost = edge.buyOffer.price * scuUsed;
  return state.budgetAuec >= buyCost;
}

export function applyLeg(
  state: LoopState,
  edge: TransitionEdge,
  travelToNext: RouteTimeEstimate,
  planner: LoopPlannerInput,
): LoopState {
  const scuUsed = resolveScuUsed(edge, state, planner);
  const buyCost = edge.buyOffer.price * scuUsed;
  const sellRevenue = edge.sellOffer.price * scuUsed;
  const legProfit = sellRevenue - buyCost;

  const buyStep = state.legsCompleted.length + 1;
  const buyLeg: TradeLeg = {
    step: buyStep,
    action: "buy",
    commodityId: edge.commodityId,
    commodity: edge.commodity,
    terminal: edge.buyOffer,
    scuUsed,
    price: edge.buyOffer.price,
    costOrRevenue: buyCost,
    profitThisLeg: 0,
    travelFromPrev: travelToNext,
  };

  const sellLeg: TradeLeg = {
    step: buyStep + 1,
    action: "sell",
    commodityId: edge.commodityId,
    commodity: edge.commodity,
    terminal: edge.sellOffer,
    scuUsed,
    price: edge.sellOffer.price,
    costOrRevenue: sellRevenue,
    profitThisLeg: legProfit,
    travelFromPrev: edge.travelTime,
  };

  return {
    currentTerminalId: edge.toTerminalId,
    budgetAuec: state.budgetAuec - buyCost + sellRevenue,
    cargoScu: 0,
    cargoCommodityId: undefined,
    legsCompleted: [...state.legsCompleted, buyLeg, sellLeg],
    totalProfit: state.totalProfit + legProfit,
    totalTimeMinutes: state.totalTimeMinutes + travelToNext.total + edge.travelTime.total,
  };
}

export function estimateRepositionTime(
  fromTerminal: TravelTimeLeg,
  toTerminal: TravelTimeLeg,
  orbitDistances: OrbitDistanceMap = {},
  options: { crew?: number; ship?: TravelTimeOptions["ship"] } = {},
): RouteTimeEstimate {
  return estimateTravelTime(fromTerminal, toTerminal, {
    cargoScu: 0,
    crew: options.crew ?? 1,
    orbitDistances,
    ship: options.ship,
  });
}

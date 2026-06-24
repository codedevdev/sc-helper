import type { FarmingSession } from "@/types/farming-session";

export interface FarmingDashboardStats {
  totalSessions: number;
  averageProfitPerSession: number;
  bestActivityType: string | null;
  bestActivityProfit: number;
  bestShip: string | null;
  bestShipProfit: number;
}

export function getFarmingDashboardStats(sessions: FarmingSession[]): FarmingDashboardStats {
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      averageProfitPerSession: 0,
      bestActivityType: null,
      bestActivityProfit: 0,
      bestShip: null,
      bestShipProfit: 0,
    };
  }

  const totalProfit = sessions.reduce((sum, s) => sum + s.netProfit, 0);
  const averageProfitPerSession = totalProfit / totalSessions;

  const activityTotals = new Map<string, number>();
  const shipTotals = new Map<string, number>();

  for (const session of sessions) {
    activityTotals.set(
      session.activityType,
      (activityTotals.get(session.activityType) ?? 0) + session.netProfit,
    );

    const ship = session.shipUsed.trim();
    if (ship) {
      shipTotals.set(ship, (shipTotals.get(ship) ?? 0) + session.netProfit);
    }
  }

  let bestActivityType: string | null = null;
  let bestActivityProfit = -Infinity;
  for (const [activity, profit] of activityTotals) {
    if (profit > bestActivityProfit) {
      bestActivityProfit = profit;
      bestActivityType = activity;
    }
  }

  let bestShip: string | null = null;
  let bestShipProfit = -Infinity;
  for (const [ship, profit] of shipTotals) {
    if (profit > bestShipProfit) {
      bestShipProfit = profit;
      bestShip = ship;
    }
  }

  return {
    totalSessions,
    averageProfitPerSession,
    bestActivityType,
    bestActivityProfit: bestActivityType ? bestActivityProfit : 0,
    bestShip,
    bestShipProfit: bestShip ? bestShipProfit : 0,
  };
}

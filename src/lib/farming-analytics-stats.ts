import { computeProfitPerHour } from "@/lib/farming-session-calculations";
import type { FarmingSession } from "@/types/farming-session";

export interface FarmingSessionRef {
  title: string;
  netProfit: number;
}

export interface FarmingAnalyticsStats {
  totalSessions: number;
  averageNetProfitPerSession: number;
  bestSession: FarmingSessionRef | null;
  worstSession: FarmingSessionRef | null;
  bestActivityType: string | null;
  bestActivityProfit: number;
  bestShip: string | null;
  bestShipProfit: number;
  averageProfitPerHour: number | null;
}

export function getFarmingAnalyticsStats(
  sessions: FarmingSession[],
): FarmingAnalyticsStats {
  const empty: FarmingAnalyticsStats = {
    totalSessions: 0,
    averageNetProfitPerSession: 0,
    bestSession: null,
    worstSession: null,
    bestActivityType: null,
    bestActivityProfit: 0,
    bestShip: null,
    bestShipProfit: 0,
    averageProfitPerHour: null,
  };

  if (sessions.length === 0) return empty;

  const totalProfit = sessions.reduce((sum, s) => sum + s.netProfit, 0);
  const averageNetProfitPerSession = totalProfit / sessions.length;

  let bestSession: FarmingSessionRef | null = null;
  let worstSession: FarmingSessionRef | null = null;
  let bestNet = -Infinity;
  let worstNet = Infinity;

  for (const session of sessions) {
    if (session.netProfit > bestNet) {
      bestNet = session.netProfit;
      bestSession = { title: session.title, netProfit: session.netProfit };
    }
    if (session.netProfit < worstNet) {
      worstNet = session.netProfit;
      worstSession = { title: session.title, netProfit: session.netProfit };
    }
  }

  const activityTotals = new Map<string, number>();
  const shipTotals = new Map<string, number>();
  const hourlyRates: number[] = [];

  for (const session of sessions) {
    activityTotals.set(
      session.activityType,
      (activityTotals.get(session.activityType) ?? 0) + session.netProfit,
    );

    const ship = session.shipUsed.trim();
    if (ship) {
      shipTotals.set(ship, (shipTotals.get(ship) ?? 0) + session.netProfit);
    }

    const rate = computeProfitPerHour(session.netProfit, session.durationMinutes);
    if (rate !== null) hourlyRates.push(rate);
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

  const averageProfitPerHour =
    hourlyRates.length > 0
      ? hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length
      : null;

  return {
    totalSessions: sessions.length,
    averageNetProfitPerSession,
    bestSession,
    worstSession,
    bestActivityType,
    bestActivityProfit: bestActivityType ? bestActivityProfit : 0,
    bestShip,
    bestShipProfit: bestShip ? bestShipProfit : 0,
    averageProfitPerHour,
  };
}

import {
  Clock,
  Rocket,
  Sprout,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import type { FarmingAnalyticsStats } from "@/lib/farming-analytics-stats";
import { formatAuec } from "@/lib/formatAuec";

interface FarmingAnalyticsCardsProps {
  stats: FarmingAnalyticsStats;
}

export function FarmingAnalyticsCards({ stats }: FarmingAnalyticsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        title="Total sessions"
        value={String(stats.totalSessions)}
        hint="Farming runs in selected range"
        icon={Sprout}
      />
      <StatCard
        title="Avg net profit / session"
        value={formatAuec(stats.averageNetProfitPerSession)}
        hint="Mean net profit across sessions"
        icon={Target}
        variant={stats.averageNetProfitPerSession < 0 ? "expense" : "profit"}
      />
      <StatCard
        title="Best session"
        value={stats.bestSession ? formatAuec(stats.bestSession.netProfit) : "—"}
        hint={stats.bestSession?.title ?? "No sessions in range"}
        icon={Trophy}
        variant="profit"
      />
      <StatCard
        title="Worst session"
        value={stats.worstSession ? formatAuec(stats.worstSession.netProfit) : "—"}
        hint={stats.worstSession?.title ?? "No sessions in range"}
        icon={TrendingDown}
        variant={stats.worstSession && stats.worstSession.netProfit < 0 ? "expense" : "default"}
      />
      <StatCard
        title="Best activity type"
        value={stats.bestActivityType ?? "—"}
        hint={
          stats.bestActivityType
            ? `${formatAuec(stats.bestActivityProfit)} total net profit`
            : "Add sessions to compare activities"
        }
        icon={TrendingUp}
        variant="profit"
      />
      <StatCard
        title="Best ship used"
        value={stats.bestShip ?? "—"}
        hint={
          stats.bestShip
            ? `${formatAuec(stats.bestShipProfit)} total net profit`
            : "Add ship names to sessions to compare"
        }
        icon={Rocket}
        variant="profit"
      />
      <StatCard
        title="Profit/hour"
        value={
          stats.averageProfitPerHour !== null
            ? formatAuec(stats.averageProfitPerHour)
            : "—"
        }
        hint="Sessions with duration recorded only"
        icon={Clock}
        variant={
          stats.averageProfitPerHour !== null && stats.averageProfitPerHour < 0
            ? "expense"
            : "profit"
        }
      />
    </div>
  );
}

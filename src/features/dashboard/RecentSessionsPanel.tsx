import { Link } from "react-router-dom";
import { Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { computeProfitPerHour } from "@/lib/farming-session-calculations";
import { formatSignedAuec, netProfitClassName } from "@/lib/formatNetProfit";
import { formatTransactionDate } from "@/lib/formatTransactionDate";
import { sortByCreatedAtDesc } from "@/lib/sortByCreatedAt";
import { cn } from "@/lib/utils";
import type { FarmingSession } from "@/types/farming-session";

const RECENT_LIMIT = 5;

interface RecentSessionsPanelProps {
  sessions: FarmingSession[];
}

export function RecentSessionsPanel({ sessions }: RecentSessionsPanelProps) {
  const recent = sortByCreatedAtDesc(sessions).slice(0, RECENT_LIMIT);

  return (
    <Card className="border-border/80 bg-card/70 backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Recent sessions
        </CardTitle>
        <Link to="/sessions" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            icon={Timer}
            title="No sessions yet"
            description="Log a farming session to track profit per hour."
            compact
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {recent.map((session) => {
              const profitPerHour = computeProfitPerHour(
                session.netProfit,
                session.durationMinutes,
              );

              return (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTransactionDate(session.createdAt)} · {session.activityType}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        netProfitClassName(session.netProfit),
                      )}
                    >
                      {formatSignedAuec(session.netProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {profitPerHour !== null
                        ? `${formatSignedAuec(profitPerHour)}/hr`
                        : "—"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

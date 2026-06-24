import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { GoalProgressBar } from "@/components/shared/GoalProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAuec } from "@/lib/formatAuec";
import { getGoalProgress } from "@/lib/goal-progress";
import type { Goal } from "@/types/goal";

interface ActiveGoalCardProps {
  goal: Goal | null;
  currentBalance: number;
  onSetGoal?: () => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export function ActiveGoalCard({ goal, currentBalance, onSetGoal }: ActiveGoalCardProps) {
  if (!goal) {
    return (
      <Card className="border-dashed border-border/80 bg-card/50">
        <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-medium text-foreground">No current goal</p>
              <p className="text-sm text-muted-foreground">
                Set a savings target to track progress toward your next purchase.
              </p>
            </div>
          </div>
          {onSetGoal ? (
            <Button type="button" size="sm" onClick={onSetGoal}>
              Set Goal
            </Button>
          ) : (
            <Link
              to="/goals"
              className="text-sm font-medium text-primary hover:underline"
            >
              Set Goal
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const { progressPercent, remainingAmount } = getGoalProgress(goal, currentBalance);

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-card/70 backdrop-blur-md shadow-[0_0_28px_-10px_oklch(0.72_0.14_195_/_0.35)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        aria-hidden
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Current Goal
        </CardTitle>
        <Target className="size-4 text-primary/70" aria-hidden />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xl font-semibold tracking-tight">{goal.title}</p>

        <GoalProgressBar value={progressPercent} />

        <div className="space-y-2">
          <StatRow label="Target" value={formatAuec(goal.targetAmount)} />
          <StatRow label="Progress" value={`${Math.round(progressPercent)}%`} />
          <StatRow label="Remaining" value={formatAuec(remainingAmount)} />
        </div>

        <Link to="/goals" className="text-xs font-medium text-primary hover:underline">
          View all goals
        </Link>
      </CardContent>
    </Card>
  );
}

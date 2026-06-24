import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { GoalProgressBar } from "@/components/shared/GoalProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAuec } from "@/lib/formatAuec";
import { getGoalProgress } from "@/lib/goal-progress";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types/goal";

interface GoalCardProps {
  goal: Goal;
  currentBalance: number;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onMarkComplete: (goal: Goal) => void;
  isMarkingComplete?: boolean;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function GoalCard({
  goal,
  currentBalance,
  onEdit,
  onDelete,
  onMarkComplete,
  isMarkingComplete = false,
}: GoalCardProps) {
  const { progressPercent, remainingAmount, effectiveCurrent } = getGoalProgress(
    goal,
    currentBalance,
  );

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/80 bg-card/70 backdrop-blur-md transition-colors",
        goal.isCompleted && "opacity-80",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg font-semibold leading-snug">{goal.title}</CardTitle>
        </div>
        {goal.isCompleted && (
          <Badge variant="secondary" className="shrink-0 gap-1">
            <CheckCircle2 className="size-3" />
            Completed
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <GoalProgressBar value={progressPercent} />

        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
          <StatRow label="Target" value={formatAuec(goal.targetAmount)} />
          <StatRow label="Current balance" value={formatAuec(effectiveCurrent)} />
          <StatRow label="Remaining" value={formatAuec(remainingAmount)} />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(goal)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onDelete(goal)}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          {!goal.isCompleted && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isMarkingComplete}
              onClick={() => onMarkComplete(goal)}
            >
              <CheckCircle2 className="size-3.5" />
              {isMarkingComplete ? "Marking…" : "Mark complete"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

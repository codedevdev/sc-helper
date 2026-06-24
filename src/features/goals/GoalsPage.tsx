import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGoals } from "@/hooks/useGoals";
import { useSettings } from "@/hooks/useSettings";
import { useTransactions } from "@/hooks/useTransactions";
import { getDashboardStats } from "@/lib/dashboard-stats";
import type { Goal } from "@/types/goal";
import { DeleteGoalDialog } from "./DeleteGoalDialog";
import { GoalCard } from "./GoalCard";
import { GoalFormDialog } from "./GoalFormDialog";

export function GoalsPage() {
  const { goals, status, error, create, update, remove, markComplete } = useGoals();
  const { settings, status: settingsStatus } = useSettings();
  const { totals, status: txStatus } = useTransactions();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const currentBalance = useMemo(() => {
    if (!settings) return 0;
    return getDashboardStats(settings, totals).currentBalance;
  }, [settings, totals]);

  const isLoading =
    status === "loading" ||
    status === "idle" ||
    settingsStatus === "loading" ||
    settingsStatus === "idle" ||
    txStatus === "loading" ||
    txStatus === "idle";

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setFormOpen(true);
  }

  function openDelete(goal: Goal) {
    setDeleting(goal);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await remove(deleting.id);
      setDeleteOpen(false);
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleMarkComplete(goal: Goal) {
    setMarkingId(goal.id);
    try {
      await markComplete(goal.id, currentBalance);
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle="Set targets for ships, gear, and savings milestones"
        action={
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" />
            Set Goal
          </Button>
        }
      />

      {status === "error" && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load goals: {error ?? "Unknown error"}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Set a target for your next ship or savings milestone. Progress is tracked against your current balance."
          />
          <div className="flex justify-center">
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              Set Goal
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currentBalance={currentBalance}
              onEdit={openEdit}
              onDelete={openDelete}
              onMarkComplete={(g) => void handleMarkComplete(g)}
              isMarkingComplete={markingId === goal.id}
            />
          ))}
        </div>
      )}

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
        onSubmit={async (input) => {
          if (editing) {
            await update(editing.id, input);
          } else {
            await create(input);
          }
        }}
      />

      <DeleteGoalDialog
        goal={deleting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void handleDeleteConfirm()}
        isDeleting={isDeleting}
      />
    </>
  );
}

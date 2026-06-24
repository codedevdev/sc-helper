import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTableSkeleton } from "@/components/shared/PageTableSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFarmingSessions } from "@/hooks/useFarmingSessions";
import { useTransactions } from "@/hooks/useTransactions";
import { createSessionTransaction } from "@/lib/createSessionTransaction";
import type { FarmingSession } from "@/types/farming-session";
import type { FarmingSessionInput } from "@/types/farming-session";
import { DeleteFarmingSessionDialog } from "./DeleteFarmingSessionDialog";
import { FarmingSessionFiltersBar } from "./FarmingSessionFilters";
import { FarmingSessionFormDialog } from "./FarmingSessionFormDialog";
import { FarmingSessionTable } from "./FarmingSessionTable";
import { filterFarmingSessions, type FarmingSessionFilters } from "./filterFarmingSessions";

const defaultFilters: FarmingSessionFilters = {
  search: "",
  activityType: "all",
};

export function SessionsPage() {
  const { sessions, status, error, create, update, remove } = useFarmingSessions();
  const { create: createTransaction } = useTransactions();
  const [filters, setFilters] = useState<FarmingSessionFilters>(defaultFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FarmingSession | null>(null);
  const [deleting, setDeleting] = useState<FarmingSession | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(
    () => filterFarmingSessions(sessions, filters),
    [sessions, filters],
  );

  const isLoading = status === "loading" || status === "idle";

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(session: FarmingSession) {
    setEditing(session);
    setFormOpen(true);
  }

  function openDelete(session: FarmingSession) {
    setDeleting(session);
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

  async function handleSubmit(input: FarmingSessionInput, shouldCreateTransaction: boolean) {
    if (editing) {
      await update(editing.id, input);
      return;
    }

    const created = await create(input);

    if (shouldCreateTransaction) {
      const txInput = createSessionTransaction(created);
      if (txInput) {
        await createTransaction(txInput);
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Sessions"
        subtitle="Log and compare your farming runs"
        action={
          <Button type="button" onClick={openCreate}>
            <Plus className="size-4" />
            Add Session
          </Button>
        }
      />

      {status === "error" && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load farming sessions: {error ?? "Unknown error"}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-border/80 bg-card/70 backdrop-blur-md">
        <CardContent className="pt-6">
          <FarmingSessionFiltersBar filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      {isLoading ? (
        <PageTableSkeleton />
      ) : (
        <Card className="border-border/80 bg-card/70 backdrop-blur-md">
          <CardContent className="overflow-x-auto pt-6">
            <FarmingSessionTable
              sessions={filtered}
              emptyMessage={
                sessions.length === 0
                  ? "No sessions yet."
                  : "No sessions match your filters."
              }
              emptyHint={
                sessions.length === 0 ? "Click Add Session to log your first run." : undefined
              }
              onEdit={openEdit}
              onDelete={openDelete}
            />
          </CardContent>
        </Card>
      )}

      <FarmingSessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        session={editing}
        onSubmit={handleSubmit}
      />

      <DeleteFarmingSessionDialog
        session={deleting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void handleDeleteConfirm()}
        isDeleting={isDeleting}
      />
    </>
  );
}

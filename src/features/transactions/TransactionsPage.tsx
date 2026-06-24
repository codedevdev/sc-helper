import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTableSkeleton } from "@/components/shared/PageTableSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction, TransactionType } from "@/types/transaction";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";
import { filterTransactions, type TransactionFilters } from "./filterTransactions";
import { TransactionFiltersBar } from "./TransactionFilters";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { TransactionTable } from "./TransactionTable";

const defaultFilters: TransactionFilters = {
  search: "",
  type: "all",
  category: "all",
};

export function TransactionsPage() {
  const { transactions, status, error, create, update, remove } = useTransactions();
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<TransactionType | undefined>();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters],
  );

  const isLoading = status === "loading" || status === "idle";

  function openCreate(type: TransactionType) {
    setEditing(null);
    setDefaultType(type);
    setFormOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setDefaultType(undefined);
    setFormOpen(true);
  }

  function openDelete(tx: Transaction) {
    setDeleting(tx);
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

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Track income, expenses, and balance adjustments"
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => openCreate("income")}>
              <ArrowUpRight className="size-4" />
              Add Income
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => openCreate("expense")}>
              <ArrowDownLeft className="size-4" />
              Add Expense
            </Button>
          </div>
        }
      />

      {status === "error" && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load transactions: {error ?? "Unknown error"}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-border/80 bg-card/70 backdrop-blur-md">
        <CardContent className="pt-6">
          <TransactionFiltersBar filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      {isLoading ? (
        <PageTableSkeleton />
      ) : (
        <Card className="border-border/80 bg-card/70 backdrop-blur-md">
          <CardContent className="overflow-x-auto pt-6">
            <TransactionTable
              transactions={filtered}
              emptyMessage={
                transactions.length === 0
                  ? "No transactions yet."
                  : "No transactions match your filters."
              }
              emptyHint={
                transactions.length === 0
                  ? "Use Add Income or Add Expense to get started."
                  : undefined
              }
              onEdit={openEdit}
              onDelete={openDelete}
            />
          </CardContent>
        </Card>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        defaultType={editing ? undefined : defaultType}
        onSubmit={async (input) => {
          if (editing) {
            await update(editing.id, input);
          } else {
            await create(input);
          }
        }}
      />

      <DeleteTransactionDialog
        transaction={deleting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void handleDeleteConfirm()}
        isDeleting={isDeleting}
      />
    </>
  );
}

import { Pencil, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTransactionDate } from "@/lib/formatTransactionDate";
import {
  formatTransactionAmount,
  transactionAmountClassName,
} from "@/lib/formatTransactionAmount";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

interface TransactionTableProps {
  transactions: Transaction[];
  emptyMessage: string;
  emptyHint?: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const typeBadgeVariant: Record<
  Transaction["type"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  income: "default",
  expense: "destructive",
  adjustment: "outline",
};

const typeLabels: Record<Transaction["type"], string> = {
  income: "Income",
  expense: "Expense",
  adjustment: "Adjustment",
};

export function TransactionTable({
  transactions,
  emptyMessage,
  emptyHint,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions"
        description={emptyHint ? `${emptyMessage} ${emptyHint}` : emptyMessage}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[100px]">Date</TableHead>
          <TableHead className="w-[100px]">Type</TableHead>
          <TableHead className="hidden sm:table-cell">Category</TableHead>
          <TableHead className="min-w-[120px]">Title</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[88px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id} className="group">
            <TableCell className="text-muted-foreground tabular-nums">
              {formatTransactionDate(tx.createdAt)}
            </TableCell>
            <TableCell>
              <Badge
                variant={typeBadgeVariant[tx.type]}
                className={cn(
                  tx.type === "income" && "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
                  tx.type === "expense" && "border-rose-500/40 bg-rose-500/15 text-rose-300",
                )}
              >
                {typeLabels[tx.type]}
              </Badge>
            </TableCell>
            <TableCell className="hidden max-w-[140px] truncate text-muted-foreground sm:table-cell">
              {tx.category}
            </TableCell>
            <TableCell>
              <div className="font-medium">{tx.title}</div>
              {tx.description && (
                <div className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground lg:max-w-[280px]">
                  {tx.description}
                </div>
              )}
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-medium tabular-nums",
                transactionAmountClassName(tx.type, tx.amount),
              )}
            >
              {formatTransactionAmount(tx.type, tx.amount)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-0.5 opacity-100 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Edit ${tx.title}`}
                  onClick={() => onEdit(tx)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Delete ${tx.title}`}
                  onClick={() => onDelete(tx)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

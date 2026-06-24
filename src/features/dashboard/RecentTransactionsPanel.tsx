import { Link } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTransactionDate } from "@/lib/formatTransactionDate";
import {
  formatTransactionAmount,
  transactionAmountClassName,
} from "@/lib/formatTransactionAmount";
import { sortByCreatedAtDesc } from "@/lib/sortByCreatedAt";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

const RECENT_LIMIT = 5;

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

interface RecentTransactionsPanelProps {
  transactions: Transaction[];
}

export function RecentTransactionsPanel({ transactions }: RecentTransactionsPanelProps) {
  const recent = sortByCreatedAtDesc(transactions).slice(0, RECENT_LIMIT);

  return (
    <Card className="border-border/80 bg-card/70 backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Recent transactions
        </CardTitle>
        <Link to="/transactions" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Add income or expenses to see them here."
            compact
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {recent.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTransactionDate(tx.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={typeBadgeVariant[tx.type]}
                    className={cn(
                      "hidden text-[10px] sm:inline-flex",
                      tx.type === "income" &&
                        "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
                      tx.type === "expense" &&
                        "border-rose-500/40 bg-rose-500/15 text-rose-300",
                    )}
                  >
                    {typeLabels[tx.type]}
                  </Badge>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      transactionAmountClassName(tx.type, tx.amount),
                    )}
                  >
                    {formatTransactionAmount(tx.type, tx.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

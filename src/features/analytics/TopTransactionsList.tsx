import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsEmptyState } from "@/features/analytics/AnalyticsEmptyState";
import { formatTransactionDate } from "@/lib/formatTransactionDate";
import {
  formatTransactionAmount,
  transactionAmountClassName,
} from "@/lib/formatTransactionAmount";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

interface TopTransactionsListProps {
  title: string;
  description: string;
  transactions: Transaction[];
  emptyMessage: string;
}

export function TopTransactionsList({
  title,
  description,
  transactions,
  emptyMessage,
}: TopTransactionsListProps) {
  return (
    <Card className="bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <AnalyticsEmptyState message={emptyMessage} />
        ) : (
          <ul className="divide-y divide-border/60">
            {transactions.map((tx, index) => (
              <li
                key={tx.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      #{index + 1}
                    </span>
                    <p className="truncate font-medium text-foreground">{tx.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tx.category} · {formatTransactionDate(tx.createdAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    transactionAmountClassName(tx.type, tx.amount),
                  )}
                >
                  {formatTransactionAmount(tx.type, tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

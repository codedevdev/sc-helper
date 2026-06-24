import type { TransactionType } from "@/types/transaction";

/**
 * Formats transaction amount with sign prefix for display.
 */
export function formatTransactionAmount(type: TransactionType, amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(Math.abs(amount)));

  switch (type) {
    case "income":
      return `+${formatted} aUEC`;
    case "expense":
      return `-${formatted} aUEC`;
    case "adjustment":
      return amount >= 0 ? `+${formatted} aUEC` : `-${formatted} aUEC`;
  }
}

export function transactionAmountClassName(type: TransactionType, amount: number): string {
  switch (type) {
    case "income":
      return "text-emerald-400 font-medium";
    case "expense":
      return "text-rose-400 font-medium";
    case "adjustment":
      return amount >= 0 ? "text-muted-foreground" : "text-amber-400/90 font-medium";
  }
}

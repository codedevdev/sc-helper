import type { Transaction, TransactionType } from "@/types/transaction";

export interface TransactionFilters {
  search: string;
  type: TransactionType | "all";
  category: string;
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const search = filters.search.trim().toLowerCase();

  return transactions
    .filter((t) => {
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.category && filters.category !== "all" && t.category !== filters.category) {
        return false;
      }
      if (!search) return true;
      const haystack = `${t.title} ${t.description}`.toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

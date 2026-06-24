import { calculateCurrentBalance } from "@/lib/balance";
import type { TransactionTotals } from "@/db/transactions";
import type { Settings } from "@/types/settings";

export interface DashboardStats {
  startingBalance: number;
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalAdjustments: number;
  netProfit: number;
}

export function getDashboardStats(
  settings: Settings,
  totals: TransactionTotals,
): DashboardStats {
  const { totalIncome, totalExpenses, totalAdjustments } = totals;
  const netProfit = totalIncome - totalExpenses;
  const currentBalance = calculateCurrentBalance({
    startingBalance: settings.startingBalance,
    totalIncome,
    totalExpenses,
    totalAdjustments,
  });

  return {
    startingBalance: settings.startingBalance,
    currentBalance,
    totalIncome,
    totalExpenses,
    totalAdjustments,
    netProfit,
  };
}

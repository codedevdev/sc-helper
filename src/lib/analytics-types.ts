export type AnalyticsTimeRange = "7d" | "30d" | "all";

export interface DailyIncomeExpense {
  date: string;
  label: string;
  income: number;
  expenses: number;
}

export interface DailyNetProfit {
  date: string;
  label: string;
  netProfit: number;
}

export interface CategoryTotal {
  name: string;
  total: number;
}

export interface ActivityTotal {
  name: string;
  total: number;
}

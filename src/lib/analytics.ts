import { format, parseISO, startOfDay, subDays } from "date-fns";
import type {
  ActivityTotal,
  AnalyticsTimeRange,
  CategoryTotal,
  DailyIncomeExpense,
  DailyNetProfit,
} from "@/lib/analytics-types";
import type { FarmingSession } from "@/types/farming-session";
import type { Transaction } from "@/types/transaction";

function parseTxDate(iso: string): Date {
  try {
    return startOfDay(parseISO(iso));
  } catch {
    return startOfDay(new Date());
  }
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function shortLabel(dateKeyStr: string): string {
  try {
    return format(parseISO(dateKeyStr), "MMM d");
  } catch {
    return dateKeyStr;
  }
}

export function getRangeStart(range: AnalyticsTimeRange, now = new Date()): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 6 : 29;
  return startOfDay(subDays(now, days));
}

export function filterTransactionsByRange(
  transactions: Transaction[],
  range: AnalyticsTimeRange,
  now = new Date(),
): Transaction[] {
  const start = getRangeStart(range, now);
  if (!start) return transactions;

  return transactions.filter((tx) => parseTxDate(tx.createdAt) >= start);
}

export function filterSessionsByRange(
  sessions: FarmingSession[],
  range: AnalyticsTimeRange,
  now = new Date(),
): FarmingSession[] {
  const start = getRangeStart(range, now);
  if (!start) return sessions;

  return sessions.filter((s) => parseTxDate(s.createdAt) >= start);
}

function buildFixedDayKeys(range: AnalyticsTimeRange, now = new Date()): string[] {
  const days = range === "7d" ? 7 : 30;
  const keys: string[] = [];
  const end = startOfDay(now);
  for (let i = days - 1; i >= 0; i--) {
    keys.push(dateKey(subDays(end, i)));
  }
  return keys;
}

function aggregateDailyBuckets(transactions: Transaction[]): Map<string, { income: number; expenses: number; adjustments: number }> {
  const buckets = new Map<string, { income: number; expenses: number; adjustments: number }>();

  for (const tx of transactions) {
    const key = dateKey(parseTxDate(tx.createdAt));
    const entry = buckets.get(key) ?? { income: 0, expenses: 0, adjustments: 0 };

    switch (tx.type) {
      case "income":
        entry.income += tx.amount;
        break;
      case "expense":
        entry.expenses += tx.amount;
        break;
      case "adjustment":
        entry.adjustments += tx.amount;
        break;
    }

    buckets.set(key, entry);
  }

  return buckets;
}

export function getDailyIncomeVsExpenses(
  transactions: Transaction[],
  range: AnalyticsTimeRange,
  now = new Date(),
): DailyIncomeExpense[] {
  const filtered = filterTransactionsByRange(transactions, range, now);
  const buckets = aggregateDailyBuckets(filtered);

  if (range === "all") {
    const keys = [...buckets.keys()].sort();
    if (keys.length === 0) return [];

    return keys.map((key) => {
      const b = buckets.get(key)!;
      return {
        date: key,
        label: shortLabel(key),
        income: b.income,
        expenses: b.expenses,
      };
    });
  }

  return buildFixedDayKeys(range, now).map((key) => {
    const b = buckets.get(key);
    return {
      date: key,
      label: shortLabel(key),
      income: b?.income ?? 0,
      expenses: b?.expenses ?? 0,
    };
  });
}

export function getDailyNetProfit(
  transactions: Transaction[],
  range: AnalyticsTimeRange,
  now = new Date(),
): DailyNetProfit[] {
  const filtered = filterTransactionsByRange(transactions, range, now);
  const buckets = aggregateDailyBuckets(filtered);

  if (range === "all") {
    const keys = [...buckets.keys()].sort();
    if (keys.length === 0) return [];

    return keys.map((key) => {
      const b = buckets.get(key)!;
      return {
        date: key,
        label: shortLabel(key),
        netProfit: b.income - b.expenses + b.adjustments,
      };
    });
  }

  return buildFixedDayKeys(range, now).map((key) => {
    const b = buckets.get(key);
    const income = b?.income ?? 0;
    const expenses = b?.expenses ?? 0;
    const adjustments = b?.adjustments ?? 0;
    return {
      date: key,
      label: shortLabel(key),
      netProfit: income - expenses + adjustments,
    };
  });
}

export function hasDailyActivity(data: { income?: number; expenses?: number; netProfit?: number }[]): boolean {
  return data.some((d) => {
    if ("netProfit" in d && d.netProfit !== undefined) {
      return d.netProfit !== 0;
    }
    const row = d as DailyIncomeExpense;
    return row.income !== 0 || row.expenses !== 0;
  });
}

export function getExpensesByCategory(
  transactions: Transaction[],
  range: AnalyticsTimeRange,
  now = new Date(),
): CategoryTotal[] {
  const filtered = filterTransactionsByRange(transactions, range, now);
  const totals = new Map<string, number>();

  for (const tx of filtered) {
    if (tx.type !== "expense") continue;
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }

  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export function getIncomeByActivity(
  transactions: Transaction[],
  sessions: FarmingSession[],
  range: AnalyticsTimeRange,
  now = new Date(),
): ActivityTotal[] {
  const filteredTx = filterTransactionsByRange(transactions, range, now);
  const filteredSessions = filterSessionsByRange(sessions, range, now);
  const totals = new Map<string, number>();

  for (const tx of filteredTx) {
    if (tx.type !== "income") continue;
    const key = tx.activityType.trim() || "Unspecified";
    totals.set(key, (totals.get(key) ?? 0) + tx.amount);
  }

  for (const session of filteredSessions) {
    if (session.netProfit <= 0) continue;
    totals.set(
      session.activityType,
      (totals.get(session.activityType) ?? 0) + session.netProfit,
    );
  }

  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export function getTopExpenses(
  transactions: Transaction[],
  range: AnalyticsTimeRange,
  limit = 5,
  now = new Date(),
): Transaction[] {
  return filterTransactionsByRange(transactions, range, now)
    .filter((tx) => tx.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function getTopIncome(
  transactions: Transaction[],
  range: AnalyticsTimeRange,
  limit = 5,
  now = new Date(),
): Transaction[] {
  return filterTransactionsByRange(transactions, range, now)
    .filter((tx) => tx.type === "income")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsSkeleton } from "@/features/analytics/AnalyticsSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AnalyticsSection } from "@/features/analytics/AnalyticsSection";
import { ExpensesByCategoryChart } from "@/features/analytics/charts/ExpensesByCategoryChart";
import { IncomeByActivityChart } from "@/features/analytics/charts/IncomeByActivityChart";
import { IncomeVsExpensesChart } from "@/features/analytics/charts/IncomeVsExpensesChart";
import { NetProfitByDayChart } from "@/features/analytics/charts/NetProfitByDayChart";
import { FarmingAnalyticsCards } from "@/features/analytics/FarmingAnalyticsCards";
import { TimeRangeToggle } from "@/features/analytics/TimeRangeToggle";
import { TopTransactionsList } from "@/features/analytics/TopTransactionsList";
import { useFarmingSessions } from "@/hooks/useFarmingSessions";
import { useTransactions } from "@/hooks/useTransactions";
import {
  filterSessionsByRange,
  getDailyIncomeVsExpenses,
  getDailyNetProfit,
  getExpensesByCategory,
  getIncomeByActivity,
  getTopExpenses,
  getTopIncome,
} from "@/lib/analytics";
import type { AnalyticsTimeRange } from "@/lib/analytics-types";
import { getFarmingAnalyticsStats } from "@/lib/farming-analytics-stats";

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>("7d");
  const { transactions, status: txStatus, error: txError } = useTransactions();
  const {
    sessions,
    status: sessionsStatus,
    error: sessionsError,
  } = useFarmingSessions();

  const isLoading =
    txStatus === "loading" ||
    txStatus === "idle" ||
    sessionsStatus === "loading" ||
    sessionsStatus === "idle";

  const loadError = txError ?? sessionsError;

  const filteredSessions = useMemo(
    () => filterSessionsByRange(sessions, timeRange),
    [sessions, timeRange],
  );

  const dailyIncomeExpense = useMemo(
    () => getDailyIncomeVsExpenses(transactions, timeRange),
    [transactions, timeRange],
  );

  const dailyNetProfit = useMemo(
    () => getDailyNetProfit(transactions, timeRange),
    [transactions, timeRange],
  );

  const expensesByCategory = useMemo(
    () => getExpensesByCategory(transactions, timeRange),
    [transactions, timeRange],
  );

  const incomeByActivity = useMemo(
    () => getIncomeByActivity(transactions, sessions, timeRange),
    [transactions, sessions, timeRange],
  );

  const farmingStats = useMemo(
    () => getFarmingAnalyticsStats(filteredSessions),
    [filteredSessions],
  );

  const topExpenses = useMemo(
    () => getTopExpenses(transactions, timeRange),
    [transactions, timeRange],
  );

  const topIncome = useMemo(
    () => getTopIncome(transactions, timeRange),
    [transactions, timeRange],
  );

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Charts and trends from your local transaction and farming data"
        action={<TimeRangeToggle value={timeRange} onChange={setTimeRange} />}
      />

      {(txStatus === "error" || sessionsStatus === "error") && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load analytics data: {loadError ?? "Unknown error"}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <IncomeVsExpensesChart data={dailyIncomeExpense} />
            <NetProfitByDayChart data={dailyNetProfit} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ExpensesByCategoryChart data={expensesByCategory} />
            <IncomeByActivityChart data={incomeByActivity} />
          </div>

          <AnalyticsSection
            title="Farming sessions"
            description="Session stats for the selected time range"
          >
            <FarmingAnalyticsCards stats={farmingStats} />
          </AnalyticsSection>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <TopTransactionsList
              title="Biggest expenses"
              description="Top 5 expense transactions by amount"
              transactions={topExpenses}
              emptyMessage="No expenses in this time range."
            />
            <TopTransactionsList
              title="Best income transactions"
              description="Top 5 income transactions by amount"
              transactions={topIncome}
              emptyMessage="No income in this time range."
            />
          </div>
        </>
      )}
    </>
  );
}

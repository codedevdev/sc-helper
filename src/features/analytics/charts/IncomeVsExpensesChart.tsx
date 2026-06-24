import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsEmptyState } from "@/features/analytics/AnalyticsEmptyState";
import { ChartCard } from "@/features/analytics/charts/ChartCard";
import {
  AuecTooltip,
  axisTickStyle,
  cartesianGridProps,
  chartMargin,
} from "@/features/analytics/chart-utils";
import { hasDailyActivity } from "@/lib/analytics";
import { EXPENSE_COLOR, INCOME_COLOR } from "@/lib/chart-colors";
import type { DailyIncomeExpense } from "@/lib/analytics-types";

interface IncomeVsExpensesChartProps {
  data: DailyIncomeExpense[];
}

export function IncomeVsExpensesChart({ data }: IncomeVsExpensesChartProps) {
  const hasData = hasDailyActivity(data);

  return (
    <ChartCard
      title="Income vs expenses"
      description="Daily totals grouped by transaction date"
    >
      {!hasData ? (
        <AnalyticsEmptyState message="No income or expenses in this time range." />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid {...cartesianGridProps} />
            <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} />
            <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={56} />
            <Tooltip content={<AuecTooltip />} />
            <Legend />
            <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

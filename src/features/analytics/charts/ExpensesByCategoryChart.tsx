import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
  formatPieTooltipValue,
  pieTooltipContentStyle,
} from "@/features/analytics/chart-utils";
import { CHART_PALETTE } from "@/lib/chart-colors";
import type { CategoryTotal } from "@/lib/analytics-types";

interface ExpensesByCategoryChartProps {
  data: CategoryTotal[];
}

const PIE_MAX_SLICES = 8;

export function ExpensesByCategoryChart({ data }: ExpensesByCategoryChartProps) {
  const hasData = data.length > 0;
  const usePie = data.length > 0 && data.length <= PIE_MAX_SLICES;

  return (
    <ChartCard
      title="Expenses by category"
      description="Total spending per expense category"
    >
      {!hasData ? (
        <AnalyticsEmptyState message="No expenses in this time range." />
      ) : usePie ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={96}
              label={({ name, percent }) =>
                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
              labelLine={{ stroke: "oklch(0.65 0.04 220)" }}
            >
              {data.map((_, i) => (
                <Cell key={data[i].name} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={formatPieTooltipValue}
              contentStyle={pieTooltipContentStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ ...chartMargin, left: 8 }}
          >
            <CartesianGrid {...cartesianGridProps} horizontal={false} />
            <XAxis type="number" tick={axisTickStyle} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip content={<AuecTooltip />} />
            <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={data[i].name} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

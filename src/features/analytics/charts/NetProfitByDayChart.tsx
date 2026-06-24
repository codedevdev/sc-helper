import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { NET_NEGATIVE, NET_POSITIVE } from "@/lib/chart-colors";
import type { DailyNetProfit } from "@/lib/analytics-types";

interface NetProfitByDayChartProps {
  data: DailyNetProfit[];
}

export function NetProfitByDayChart({ data }: NetProfitByDayChartProps) {
  const hasData = useMemo(
    () => data.some((d) => d.netProfit !== 0),
    [data],
  );

  return (
    <ChartCard
      title="Net profit by day"
      description="Income − expenses + adjustments per day"
    >
      {!hasData ? (
        <AnalyticsEmptyState message="No net profit activity in this time range." />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid {...cartesianGridProps} />
            <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} />
            <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} width={56} />
            <Tooltip content={<AuecTooltip />} />
            <Bar dataKey="netProfit" name="Net profit" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.netProfit >= 0 ? NET_POSITIVE : NET_NEGATIVE}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

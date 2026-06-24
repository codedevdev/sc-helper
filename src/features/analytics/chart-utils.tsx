import { formatAuec } from "@/lib/formatAuec";
import { AXIS_COLOR, GRID_COLOR } from "@/lib/chart-colors";

export const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 };

export const axisTickStyle = { fill: AXIS_COLOR, fontSize: 11 };

export const cartesianGridProps = {
  stroke: GRID_COLOR,
  strokeDasharray: "3 3",
  vertical: false,
};

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

interface AuecTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

export function AuecTooltip({ active, payload, label }: AuecTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/80 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {label && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="font-medium tabular-nums" style={{ color: entry.color }}>
              {formatAuec(Number(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const pieTooltipContentStyle = {
  background: "oklch(0.16 0.025 250)",
  border: "1px solid oklch(0.28 0.04 250)",
  borderRadius: "0.5rem",
  fontSize: 12,
};

export function formatPieTooltipValue(value: unknown): string {
  return formatAuec(Number(value ?? 0));
}

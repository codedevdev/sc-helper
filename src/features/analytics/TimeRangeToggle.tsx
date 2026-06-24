import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalyticsTimeRange } from "@/lib/analytics-types";

const OPTIONS: { value: AnalyticsTimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

interface TimeRangeToggleProps {
  value: AnalyticsTimeRange;
  onChange: (value: AnalyticsTimeRange) => void;
}

export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-border/80 bg-muted/30 p-1 shadow-sm"
      role="group"
      aria-label="Time range"
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-3 transition-all",
              isActive &&
                "bg-primary/15 text-primary shadow-[0_0_16px_-4px_oklch(0.72_0.14_195_/_0.5)] hover:bg-primary/20 hover:text-primary",
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

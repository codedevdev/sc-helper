import { cn } from "@/lib/utils";

interface GoalProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function GoalProgressBar({ value, className, showLabel = true }: GoalProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, 100));
  const rounded = Math.round(clamped);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${rounded}%`}
      >
        <div
          className="h-full rounded-full bg-primary shadow-[0_0_12px_0_oklch(0.72_0.14_195_/_0.5)] transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-10 shrink-0 text-right text-sm font-medium text-foreground tabular-nums">
          {rounded}%
        </span>
      )}
    </div>
  );
}

import { formatDistanceToNow } from "date-fns";
import { useUexData } from "@/hooks/useUexData";
import { cn } from "@/lib/utils";
import type { UexConnectionStatus } from "@/lib/uex/types";

const statusConfig: Record<
  UexConnectionStatus,
  { label: string; dotClass: string }
> = {
  idle: { label: "UEX: —", dotClass: "bg-muted-foreground/50" },
  loading: { label: "UEX: Syncing…", dotClass: "bg-primary animate-pulse" },
  online: { label: "UEX: Online", dotClass: "bg-emerald-500" },
  stale: { label: "UEX: Stale / cached", dotClass: "bg-amber-500" },
  offline: { label: "UEX: Offline", dotClass: "bg-rose-500" },
};

interface UexStatusIndicatorProps {
  showLastSync?: boolean;
  className?: string;
}

export function UexStatusIndicator({ showLastSync = true, className }: UexStatusIndicatorProps) {
  const { status, lastSync, error, isFromSnapshot, isStale } = useUexData();
  const { label, dotClass } = statusConfig[status];

  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn("size-1.5 shrink-0 rounded-full", dotClass)}
          aria-hidden
        />
        <span className="text-[11px] text-muted-foreground/80">{label}</span>
      </div>
      {showLastSync && lastSync && status !== "offline" && (
        <p className="pl-3.5 text-[10px] text-muted-foreground/60">
          {isFromSnapshot ? "Cached snapshot " : "Synced "}
          {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
        </p>
      )}
      {(isStale || isFromSnapshot) && !error && lastSync && (
        <p className="pl-3.5 text-[10px] text-amber-200/70">
          Prices may be outdated
        </p>
      )}
      {error && (
        <p
          className={cn(
            "pl-3.5 text-[10px] truncate",
            status === "offline" ? "text-destructive/80" : "text-amber-200/80",
          )}
          title={error}
        >
          {error}
        </p>
      )}
    </div>
  );
}

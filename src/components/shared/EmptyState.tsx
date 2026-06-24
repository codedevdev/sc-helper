import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description: string;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      <Icon className="size-8 text-muted-foreground/60" aria-hidden />
      {title && (
        <p className={cn("font-medium text-foreground", compact ? "mt-3 text-sm" : "mt-4")}>
          {title}
        </p>
      )}
      <p
        className={cn(
          "max-w-sm text-muted-foreground",
          compact ? "mt-1 text-xs" : "mt-2 text-sm",
          !title && (compact ? "mt-3" : "mt-4"),
        )}
      >
        {description}
      </p>
    </div>
  );
}

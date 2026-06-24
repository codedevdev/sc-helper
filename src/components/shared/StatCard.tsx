import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  variant?: "default" | "income" | "expense" | "profit";
  size?: "default" | "hero";
}

const variantStyles = {
  default: "border-border/80",
  income: "border-emerald-500/30 shadow-[0_0_24px_-8px_oklch(0.65_0.15_155_/_0.35)]",
  expense: "border-rose-500/30 shadow-[0_0_24px_-8px_oklch(0.55_0.18_25_/_0.3)]",
  profit: "border-primary/40 shadow-[0_0_28px_-10px_oklch(0.72_0.14_195_/_0.45)]",
};

const valueSizes = {
  default: "text-2xl sm:text-3xl",
  hero: "text-3xl sm:text-4xl",
};

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  variant = "default",
  size = "default",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-card/70 backdrop-blur-md transition-colors",
        variantStyles[variant],
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      <CardHeader
        className={cn(
          "flex flex-row items-start justify-between space-y-0",
          size === "hero" ? "pb-3" : "pb-2",
        )}
      >
        <CardTitle className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </CardTitle>
        {Icon && (
          <Icon
            className={cn("shrink-0 text-primary/70", size === "hero" ? "size-5" : "size-4")}
            aria-hidden
          />
        )}
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-semibold tracking-tight text-foreground tabular-nums",
            valueSizes[size],
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

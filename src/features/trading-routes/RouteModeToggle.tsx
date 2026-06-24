import { Route, RefreshCw, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TradingRouteMode } from "@/types/trading-route";

interface RouteModeToggleProps {
  mode: TradingRouteMode;
  onModeChange: (mode: TradingRouteMode) => void;
  disabled?: boolean;
}

const MODES: { value: TradingRouteMode; label: string; icon: typeof Route }[] = [
  { value: "single", label: "Single Route", icon: Route },
  { value: "loop", label: "Loop Planner", icon: RefreshCw },
  { value: "en-route", label: "En Route", icon: MapPin },
  { value: "lookup", label: "Market Lookup", icon: Search },
];

export function RouteModeToggle({ mode, onModeChange, disabled }: RouteModeToggleProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <div className="inline-flex flex-wrap rounded-lg border border-border/60 bg-muted/20 p-1">
        {MODES.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={mode === value ? "secondary" : "ghost"}
            disabled={disabled && value === "single"}
            className={cn("gap-2", mode === value && "shadow-sm")}
            onClick={() => onModeChange(value)}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

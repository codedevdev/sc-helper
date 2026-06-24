import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { systemFilterSummary } from "@/lib/trading-routes/loop-system-filter";
import type { LoopPlannerInput } from "@/types/trading-route";

export interface StarSystemOption {
  id: number;
  name: string;
}

interface LoopSystemFilterPanelProps {
  planner: LoopPlannerInput;
  systems: StarSystemOption[];
  disabled?: boolean;
  onPlannerChange: (patch: Partial<LoopPlannerInput>) => void;
}

const MODES: { value: NonNullable<LoopPlannerInput["systemFilterMode"]>; label: string }[] = [
  { value: "all", label: "All systems" },
  { value: "allow", label: "Only these" },
  { value: "exclude", label: "Exclude" },
];

export function LoopSystemFilterPanel({
  planner,
  systems,
  disabled,
  onPlannerChange,
}: LoopSystemFilterPanelProps) {
  const mode = planner.systemFilterMode ?? "all";
  const activeIds =
    mode === "allow"
      ? new Set(planner.allowedSystemIds ?? [])
      : mode === "exclude"
        ? new Set(planner.excludedSystemIds ?? [])
        : new Set<number>();

  const systemNames = new Map(systems.map((s) => [s.id, s.name]));
  const summary = systemFilterSummary(planner, systemNames);

  function handleModeChange(nextMode: NonNullable<LoopPlannerInput["systemFilterMode"]>) {
    onPlannerChange({ systemFilterMode: nextMode });
  }

  function toggleSystem(systemId: number) {
    if (mode === "allow") {
      const current = planner.allowedSystemIds ?? [];
      const next = activeIds.has(systemId)
        ? current.filter((id) => id !== systemId)
        : [...current, systemId];
      onPlannerChange({ allowedSystemIds: next });
      return;
    }
    if (mode === "exclude") {
      const current = planner.excludedSystemIds ?? [];
      const next = activeIds.has(systemId)
        ? current.filter((id) => id !== systemId)
        : [...current, systemId];
      onPlannerChange({ excludedSystemIds: next });
    }
  }

  const sortedSystems = [...systems].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">Star systems</Label>
        <span className="text-xs text-muted-foreground">{summary}</span>
      </div>

      <div
        className="inline-flex flex-wrap gap-1 rounded-lg border border-border/80 bg-muted/30 p-1"
        role="group"
        aria-label="System filter mode"
      >
        {MODES.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className={cn(
              "h-8 px-3 transition-all",
              mode === value &&
                "bg-primary/15 text-primary shadow-[0_0_16px_-4px_oklch(0.72_0.14_195_/_0.5)] hover:bg-primary/20 hover:text-primary",
            )}
            onClick={() => handleModeChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div
        className={cn(
          "flex flex-wrap gap-2",
          mode === "all" && "pointer-events-none opacity-50",
        )}
      >
        {sortedSystems.map((system) => {
          const selected = activeIds.has(system.id);
          return (
            <Button
              key={system.id}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              disabled={disabled || mode === "all"}
              className={cn("h-8", !selected && "text-muted-foreground")}
              onClick={() => toggleSystem(system.id)}
            >
              {system.name}
            </Button>
          );
        })}
        {sortedSystems.length === 0 && (
          <span className="text-xs text-muted-foreground">No systems in market data</span>
        )}
      </div>
    </div>
  );
}

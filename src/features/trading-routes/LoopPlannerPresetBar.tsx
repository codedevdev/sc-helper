import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LOOP_PLANNER_PRESET_IDS,
  LOOP_PLANNER_PRESETS,
  type LoopPlannerPresetId,
} from "./loop-planner-presets";

interface LoopPlannerPresetBarProps {
  activePresetId: LoopPlannerPresetId | null;
  disabled?: boolean;
  onPresetSelect: (id: LoopPlannerPresetId) => void;
}

export function LoopPlannerPresetBar({
  activePresetId,
  disabled,
  onPresetSelect,
}: LoopPlannerPresetBarProps) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg border border-border/80 bg-muted/30 p-1 shadow-sm"
      role="group"
      aria-label="Loop planner presets"
    >
      {LOOP_PLANNER_PRESET_IDS.map((id) => {
        const isActive = activePresetId === id;
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className={cn(
              "h-8 px-3 transition-all",
              isActive &&
                "bg-primary/15 text-primary shadow-[0_0_16px_-4px_oklch(0.72_0.14_195_/_0.5)] hover:bg-primary/20 hover:text-primary",
            )}
            onClick={() => onPresetSelect(id)}
          >
            {LOOP_PLANNER_PRESETS[id].label}
          </Button>
        );
      })}
    </div>
  );
}

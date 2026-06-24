import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FILTER_PRESET_IDS,
  FILTER_PRESETS,
  type FilterPresetId,
} from "@/lib/trading-routes/filter-presets";

interface FilterPresetBarProps {
  activePresetId: FilterPresetId | null;
  onPresetSelect: (id: FilterPresetId) => void;
}

export function FilterPresetBar({ activePresetId, onPresetSelect }: FilterPresetBarProps) {
  return (
    <div
      className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border border-border/80 bg-muted/30 p-1 shadow-sm"
      role="group"
      aria-label="Filter presets"
    >
      {FILTER_PRESET_IDS.map((id) => {
        const isActive = activePresetId === id;
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-3 transition-all",
              isActive &&
                "bg-primary/15 text-primary shadow-[0_0_16px_-4px_oklch(0.72_0.14_195_/_0.5)] hover:bg-primary/20 hover:text-primary",
            )}
            onClick={() => onPresetSelect(id)}
          >
            {FILTER_PRESETS[id].label}
          </Button>
        );
      })}
    </div>
  );
}

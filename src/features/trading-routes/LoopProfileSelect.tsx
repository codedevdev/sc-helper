import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LOOP_PLANNER_PRESET_IDS,
  LOOP_PLANNER_PRESETS,
  type LoopPlannerPresetId,
  type LoopPlannerProfileValue,
} from "./loop-planner-presets";

interface LoopProfileSelectProps {
  value: LoopPlannerProfileValue;
  disabled?: boolean;
  onPresetSelect: (id: LoopPlannerPresetId) => void;
}

export function LoopProfileSelect({ value, disabled, onPresetSelect }: LoopProfileSelectProps) {
  const activePreset = value === "custom" ? null : LOOP_PLANNER_PRESETS[value];

  return (
    <div className="space-y-2">
      <Label>Profile</Label>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          if (v !== "custom") onPresetSelect(v as LoopPlannerPresetId);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {value === "custom" ? (
              <span>Custom</span>
            ) : (
              <span>{activePreset?.label}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LOOP_PLANNER_PRESET_IDS.map((id) => {
            const preset = LOOP_PLANNER_PRESETS[id];
            return (
              <SelectItem key={id} value={id}>
                <div className="flex flex-col gap-0.5 py-0.5">
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {value === "custom" && (
        <p className="text-xs text-muted-foreground">
          Custom settings — pick a profile to reset search options.
        </p>
      )}
      {activePreset && (
        <p className="text-xs text-muted-foreground">{activePreset.description}</p>
      )}
    </div>
  );
}

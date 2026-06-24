import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PilotModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function PilotModeToggle({ enabled, onChange, disabled }: PilotModeToggleProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? "secondary" : "outline"}
      disabled={disabled}
      className={cn("gap-2", enabled && "shadow-sm")}
      onClick={() => onChange(!enabled)}
    >
      <GraduationCap className="size-4" />
      Pilot mode
    </Button>
  );
}

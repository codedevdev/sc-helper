import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ActiveFilterChip {
  id: string;
  label: string;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
}

export function ActiveFilterChips({ chips, onRemove, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.id} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            className="rounded p-0.5 hover:bg-muted"
            aria-label={`Remove ${chip.label}`}
            onClick={() => onRemove(chip.id)}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      {onClearAll && chips.length > 1 && (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}

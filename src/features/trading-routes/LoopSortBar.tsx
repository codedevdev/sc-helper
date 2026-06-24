import { ArrowUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LoopPlannerSortKey } from "@/types/trading-route";

const SORT_OPTIONS: { value: LoopPlannerSortKey; label: string }[] = [
  { value: "total-profit", label: "Total profit" },
  { value: "profit-per-min", label: "Profit / min" },
  { value: "total-time", label: "Fastest" },
  { value: "leg-count", label: "Leg count" },
];

interface LoopSortBarProps {
  sort: LoopPlannerSortKey;
  onSortChange: (sort: LoopPlannerSortKey) => void;
}

export function LoopSortBar({ sort, onSortChange }: LoopSortBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Label className="shrink-0 text-sm text-muted-foreground">Sort by</Label>
      <Select value={sort} onValueChange={(v) => onSortChange(v as LoopPlannerSortKey)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

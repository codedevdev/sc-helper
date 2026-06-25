import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { LoopPlannerFilters } from "@/types/trading-route";
import { CollapsibleSection } from "./CollapsibleSection";
import type { StarSystemOption } from "./LoopSystemFilterPanel";

interface LoopResultFiltersPanelProps {
  filters: LoopPlannerFilters;
  systems: StarSystemOption[];
  commodities: string[];
  disabled?: boolean;
  onFiltersChange: (patch: Partial<LoopPlannerFilters>) => void;
}

export function LoopResultFiltersPanel({
  filters,
  systems,
  commodities,
  disabled,
  onFiltersChange,
}: LoopResultFiltersPanelProps) {
  const hasActiveFilters =
    Boolean(filters.commodity?.trim()) ||
    Boolean(filters.system?.trim()) ||
    Boolean(filters.terminal?.trim()) ||
    (filters.minProfit != null && filters.minProfit > 0) ||
    (filters.maxTime != null && filters.maxTime > 0);

  const summary = hasActiveFilters ? "Filters active" : undefined;

  return (
    <CollapsibleSection title="Filter results" summary={summary} className="mb-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          label="Commodity in loop"
          value={filters.commodity || "__all__"}
          allOption={{ value: "__all__", label: "Any commodity" }}
          options={commodities.map((c) => ({ value: c, label: c }))}
          placeholder="Search commodities…"
          disabled={disabled}
          onValueChange={(v) => onFiltersChange({ commodity: v === "__all__" ? "" : v })}
        />

        <SearchableSelect
          label="System in loop"
          value={filters.system || "__all__"}
          allOption={{ value: "__all__", label: "Any system" }}
          options={systems.map((s) => ({ value: s.name, label: s.name }))}
          placeholder="Search systems…"
          disabled={disabled}
          onValueChange={(v) => onFiltersChange({ system: v === "__all__" ? "" : v })}
        />

        <div className="space-y-2">
          <Label htmlFor="lpf-terminal">Terminal contains</Label>
          <Input
            id="lpf-terminal"
            disabled={disabled}
            value={filters.terminal ?? ""}
            placeholder="e.g. Lorville"
            onChange={(e) => onFiltersChange({ terminal: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lpf-min-profit">Min profit (aUEC)</Label>
          <Input
            id="lpf-min-profit"
            type="number"
            min={0}
            disabled={disabled}
            value={filters.minProfit ?? ""}
            placeholder="Any"
            onChange={(e) => {
              const raw = e.target.value;
              onFiltersChange({
                minProfit: raw === "" ? undefined : Math.max(0, Number(raw) || 0),
              });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lpf-max-time">Max route time (results)</Label>
          <Input
            id="lpf-max-time"
            type="number"
            min={0}
            disabled={disabled}
            value={filters.maxTime ?? ""}
            placeholder="Any"
            onChange={(e) => {
              const raw = e.target.value;
              onFiltersChange({
                maxTime: raw === "" ? undefined : Math.max(0, Number(raw) || 0),
              });
            }}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CONTAINER_SIZE_OPTIONS } from "@/features/trading-routes/route-filter-utils";
import type { TradingRouteFilters } from "@/types/trading-route";
import { CollapsibleSection } from "./CollapsibleSection";

interface MarketFiltersSectionProps {
  filters: TradingRouteFilters;
  systems: string[];
  commodities: string[];
  disabled?: boolean;
  onFiltersChange: (patch: Partial<TradingRouteFilters>) => void;
}

function PlannerToggle({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        className="size-4 rounded border-border accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Label htmlFor={id} className="cursor-pointer font-normal">
        {label}
      </Label>
    </div>
  );
}

export function MarketFiltersSection({
  filters,
  systems,
  commodities,
  disabled,
  onFiltersChange,
}: MarketFiltersSectionProps) {
  const systemOptions = systems.map((s) => ({ value: s, label: s }));
  const commodityOptions = commodities.map((c) => ({ value: c, label: c }));

  return (
    <CollapsibleSection title="Market filters">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          label="Buy system"
          value={filters.buySystem || "__all__"}
          allOption={{ value: "__all__", label: "Any buy system" }}
          options={systemOptions}
          placeholder="Search systems…"
          disabled={disabled}
          onValueChange={(v) => onFiltersChange({ buySystem: v === "__all__" ? "" : v })}
        />

        <SearchableSelect
          label="Sell system"
          value={filters.sellSystem || "__all__"}
          allOption={{ value: "__all__", label: "Any sell system" }}
          options={systemOptions}
          placeholder="Search systems…"
          disabled={disabled}
          onValueChange={(v) => onFiltersChange({ sellSystem: v === "__all__" ? "" : v })}
        />

        <SearchableSelect
          label="Commodity"
          value={filters.commodity || "__all__"}
          allOption={{ value: "__all__", label: "All commodities" }}
          options={commodityOptions}
          placeholder="Search commodities…"
          disabled={disabled}
          onValueChange={(v) => onFiltersChange({ commodity: v === "__all__" ? "" : v })}
        />

        <div className="space-y-2">
          <Label>Min box size</Label>
          <Select
            value={filters.minContainerSize ? String(filters.minContainerSize) : "__any__"}
            disabled={disabled}
            onValueChange={(v) =>
              onFiltersChange({
                minContainerSize: v === "__any__" ? undefined : Number(v),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any__">Any</SelectItem>
              {CONTAINER_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} SCU
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mf-min-stock">Min sell demand (SCU)</Label>
          <Input
            id="mf-min-stock"
            type="number"
            min={0}
            disabled={disabled}
            value={filters.minStock ?? ""}
            placeholder="Any"
            onChange={(e) => {
              const raw = e.target.value;
              onFiltersChange({ minStock: raw === "" ? undefined : Math.max(0, Number(raw) || 0) });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mf-min-sell-stock">Min sell stock at build (SCU)</Label>
          <Input
            id="mf-min-sell-stock"
            type="number"
            min={0}
            disabled={disabled}
            value={filters.minSellStock ?? ""}
            placeholder="Any"
            onChange={(e) => {
              const raw = e.target.value;
              onFiltersChange({
                minSellStock: raw === "" ? undefined : Math.max(0, Number(raw) || 0),
              });
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <PlannerToggle
          id="mf-autoload"
          label="Autoload only (cargo / freight / dock)"
          checked={filters.autoloadOnly ?? false}
          disabled={disabled}
          onChange={(checked) => onFiltersChange({ autoloadOnly: checked })}
        />
        <PlannerToggle
          id="mf-volatile"
          label="Exclude volatile QT"
          checked={filters.excludeVolatileQt ?? false}
          disabled={disabled}
          onChange={(checked) => onFiltersChange({ excludeVolatileQt: checked })}
        />
      </div>
    </CollapsibleSection>
  );
}

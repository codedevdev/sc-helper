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
import type { TradingRouteFilters, TradingRoutePlannerInput } from "@/types/trading-route";
import { FilterPresetBar } from "./FilterPresetBar";
import { MarketFiltersSection } from "./MarketFiltersSection";
import { ShipSelect } from "./ShipSelect";
import type { FilterPresetId } from "@/lib/trading-routes/filter-presets";

interface RouteFiltersPanelProps {
  planner: TradingRoutePlannerInput;
  filters: TradingRouteFilters;
  shipName: string;
  activePresetId: FilterPresetId | null;
  systems: string[];
  commodities: string[];
  onPlannerChange: (patch: Partial<TradingRoutePlannerInput>) => void;
  onFiltersChange: (patch: Partial<TradingRouteFilters>) => void;
  onShipChange: (name: string, scu: number) => void;
  onPresetSelect: (id: FilterPresetId) => void;
  disabled?: boolean;
}

export function RouteFiltersPanel({
  planner,
  filters,
  shipName,
  activePresetId,
  systems,
  commodities,
  onPlannerChange,
  onFiltersChange,
  onShipChange,
  onPresetSelect,
  disabled,
}: RouteFiltersPanelProps) {
  return (
    <div className="space-y-6">
      <FilterPresetBar activePresetId={activePresetId} onPresetSelect={onPresetSelect} />

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ShipSelect shipName={shipName} onShipChange={onShipChange} disabled={disabled} />

          <div className="space-y-2">
            <Label htmlFor="tr-cargo">Cargo (SCU)</Label>
            <Input
              id="tr-cargo"
              type="number"
              min={1}
              disabled={disabled}
              value={planner.cargoScu}
              onChange={(e) => onPlannerChange({ cargoScu: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tr-budget">Budget (aUEC)</Label>
            <Input
              id="tr-budget"
              type="number"
              min={0}
              disabled={disabled}
              value={planner.budgetAuec || ""}
              placeholder="0 = unlimited"
              onChange={(e) =>
                onPlannerChange({ budgetAuec: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Crew</Label>
            <Select
              value={String(planner.crew)}
              disabled={disabled}
              onValueChange={(v) =>
                onPlannerChange({ crew: Number(v) as TradingRoutePlannerInput["crew"] })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Solo</SelectItem>
                <SelectItem value="2">2 players</SelectItem>
                <SelectItem value="3">3 players</SelectItem>
                <SelectItem value="4">4 players</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Route</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Legality</Label>
            <Select
              value={filters.legality}
              disabled={disabled}
              onValueChange={(v) =>
                onFiltersChange({ legality: v as TradingRouteFilters["legality"] })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="illegal">Illegal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Same system</Label>
            <Select
              value={filters.sameSystem}
              disabled={disabled}
              onValueChange={(v) =>
                onFiltersChange({ sameSystem: v as TradingRouteFilters["sameSystem"] })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cargo center</Label>
            <Select
              value={filters.cargoCenter}
              disabled={disabled}
              onValueChange={(v) =>
                onFiltersChange({ cargoCenter: v as TradingRouteFilters["cargoCenter"] })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="both">Buy + sell</SelectItem>
                <SelectItem value="buy">Buy only</SelectItem>
                <SelectItem value="sell">Sell only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SearchableSelect
            label="Any system (buy or sell)"
            value={filters.system || "__all__"}
            allOption={{ value: "__all__", label: "All systems" }}
            options={systems.map((s) => ({ value: s, label: s }))}
            placeholder="Search systems…"
            disabled={disabled}
            onValueChange={(v) => onFiltersChange({ system: v === "__all__" ? "" : v })}
          />
        </div>
      </div>

      <MarketFiltersSection
        filters={filters}
        systems={systems}
        commodities={commodities}
        disabled={disabled}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
}

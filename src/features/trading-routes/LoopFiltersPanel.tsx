import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  applyLoopPlannerPreset,
  detectMatchingLoopPlannerPresetId,
  type LoopPlannerPresetId,
} from "@/features/trading-routes/loop-planner-presets";
import type { LoopPlannerFilters, LoopPlannerInput } from "@/types/trading-route";
import { CollapsibleSection } from "./CollapsibleSection";
import { LoopPlannerPresetBar } from "./LoopPlannerPresetBar";
import { LoopSystemFilterPanel, type StarSystemOption } from "./LoopSystemFilterPanel";
import { ShipSelect } from "./ShipSelect";

const LEG_MIN = 3;
const LEG_MAX = 7;

export interface TerminalOption {
  id: number;
  label: string;
}

interface LoopFiltersPanelProps {
  planner: LoopPlannerInput;
  filters: LoopPlannerFilters;
  shipName: string;
  terminals: TerminalOption[];
  systems: StarSystemOption[];
  commodities: string[];
  stantonSystemId?: number;
  disabled?: boolean;
  onPlannerChange: (patch: Partial<LoopPlannerInput>) => void;
  onFiltersChange: (patch: Partial<LoopPlannerFilters>) => void;
  onShipChange: (name: string, scu: number) => void;
}

function clampLegs(value: number): number {
  return Math.min(LEG_MAX, Math.max(LEG_MIN, value));
}

function LegStepper({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          disabled={disabled || value <= LEG_MIN}
          onClick={() => onChange(clampLegs(value - 1))}
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          disabled={disabled || value >= LEG_MAX}
          onClick={() => onChange(clampLegs(value + 1))}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
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

export function LoopFiltersPanel({
  planner,
  filters,
  shipName,
  terminals,
  systems,
  commodities,
  stantonSystemId,
  disabled,
  onPlannerChange,
  onFiltersChange,
  onShipChange,
}: LoopFiltersPanelProps) {
  const minLegs = planner.minLegs ?? LEG_MIN;
  const maxLegs = planner.maxLegs ?? LEG_MAX;

  const activePresetId = useMemo(
    () => detectMatchingLoopPlannerPresetId(planner, shipName, stantonSystemId),
    [planner, shipName, stantonSystemId],
  );

  const terminalOptions = useMemo(
    () =>
      [...terminals]
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((t) => ({ value: String(t.id), label: t.label })),
    [terminals],
  );

  function handleMinLegsChange(next: number) {
    const clamped = clampLegs(next);
    onPlannerChange({ minLegs: clamped, maxLegs: Math.max(clamped, maxLegs) });
  }

  function handleMaxLegsChange(next: number) {
    const clamped = clampLegs(next);
    onPlannerChange({ maxLegs: clamped, minLegs: Math.min(clamped, minLegs) });
  }

  function handlePresetSelect(id: LoopPlannerPresetId) {
    const applied = applyLoopPlannerPreset(
      id,
      { planner, shipName },
      (partial) => ({ ...planner, ...partial }),
      { stantonSystemId },
    );
    onShipChange(applied.shipName, applied.planner.shipScu ?? applied.planner.cargoScu);
    onPlannerChange(applied.planner);
  }

  return (
    <div className="space-y-6">
      <LoopPlannerPresetBar
        activePresetId={activePresetId}
        disabled={disabled}
        onPresetSelect={handlePresetSelect}
      />

      <LoopSystemFilterPanel
        planner={planner}
        systems={systems}
        disabled={disabled}
        onPlannerChange={onPlannerChange}
      />

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Route</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LegStepper
            label="Min legs"
            value={minLegs}
            disabled={disabled}
            onChange={handleMinLegsChange}
          />
          <LegStepper
            label="Max legs"
            value={maxLegs}
            disabled={disabled}
            onChange={handleMaxLegsChange}
          />

          <SearchableSelect
            label="Start terminal"
            value={planner.startTerminalId != null ? String(planner.startTerminalId) : "__any__"}
            allOption={{ value: "__any__", label: "Any terminal" }}
            options={terminalOptions}
            placeholder="Search terminals…"
            disabled={disabled}
            onValueChange={(v) =>
              onPlannerChange({
                startTerminalId: v === "__any__" ? undefined : Number(v),
              })
            }
          />

          <div className="space-y-2">
            <Label htmlFor="lp-max-time">Max total time (min)</Label>
            <Input
              id="lp-max-time"
              type="number"
              min={0}
              disabled={disabled}
              value={planner.maxTotalTimeMinutes ?? ""}
              placeholder="Unlimited"
              onChange={(e) => {
                const raw = e.target.value;
                onPlannerChange({
                  maxTotalTimeMinutes: raw === "" ? undefined : Math.max(0, Number(raw) || 0),
                });
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ship &amp; cargo
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ShipSelect shipName={shipName} onShipChange={onShipChange} disabled={disabled} />

          <div className="space-y-2">
            <Label htmlFor="lp-cargo">Cargo (SCU)</Label>
            <Input
              id="lp-cargo"
              type="number"
              min={1}
              disabled={disabled}
              value={planner.cargoScu}
              onChange={(e) =>
                onPlannerChange({ cargoScu: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lp-budget">Budget (aUEC)</Label>
            <Input
              id="lp-budget"
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
                onPlannerChange({ crew: Number(v) as LoopPlannerInput["crew"] })
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
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Options</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <PlannerToggle
            id="lp-return-start"
            label="Return to start"
            checked={planner.returnToStart ?? true}
            disabled={disabled}
            onChange={(checked) => onPlannerChange({ returnToStart: checked })}
          />
          <PlannerToggle
            id="lp-same-system"
            label="Same system"
            checked={planner.sameSystemOnly ?? false}
            disabled={disabled}
            onChange={(checked) => onPlannerChange({ sameSystemOnly: checked })}
          />
          <PlannerToggle
            id="lp-mixed-commodities"
            label="Mixed commodities"
            checked={planner.allowMixedCommodities ?? true}
            disabled={disabled}
            onChange={(checked) => onPlannerChange({ allowMixedCommodities: checked })}
          />
          <PlannerToggle
            id="lp-exclude-illegal"
            label="Exclude illegal"
            checked={planner.excludeIllegal ?? false}
            disabled={disabled}
            onChange={(checked) => onPlannerChange({ excludeIllegal: checked })}
          />
          <PlannerToggle
            id="lp-cargo-center"
            label="Require cargo center"
            checked={planner.requireCargoCenter ?? false}
            disabled={disabled}
            onChange={(checked) => onPlannerChange({ requireCargoCenter: checked })}
          />
        </div>
      </div>

      <CollapsibleSection title="Result filters">
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
            <Label htmlFor="lpf-max-time">Max time (min)</Label>
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
    </div>
  );
}

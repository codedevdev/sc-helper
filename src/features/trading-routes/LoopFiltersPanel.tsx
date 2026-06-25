import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { mergeLoopPlannerInput } from "@/features/trading-routes/default-loop-planner";
import {
  applyLoopPlannerPreset,
  isStantonOnly,
  resolveLoopProfileValue,
  stantonOnlyPatch,
  type LoopPlannerPresetId,
} from "@/features/trading-routes/loop-planner-presets";
import { buildLoopPlannerSummary } from "@/features/trading-routes/loop-planner-summary";
import type { TradingShip } from "@/lib/trading-routes/ships";
import type { LoopPlannerInput } from "@/types/trading-route";
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
import { CollapsibleSection } from "./CollapsibleSection";
import { LoopProfileSelect } from "./LoopProfileSelect";
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
  shipName: string;
  ships: TradingShip[];
  shipsLoading?: boolean;
  terminals: TerminalOption[];
  systems: StarSystemOption[];
  stantonSystemId?: number;
  disabled?: boolean;
  onPlannerChange: (patch: Partial<LoopPlannerInput>) => void;
  onPlannerReplace: (planner: LoopPlannerInput) => void;
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
  shipName,
  ships,
  shipsLoading,
  terminals,
  systems,
  stantonSystemId,
  disabled,
  onPlannerChange,
  onPlannerReplace,
  onShipChange,
}: LoopFiltersPanelProps) {
  const minLegs = planner.minLegs ?? LEG_MIN;
  const maxLegs = planner.maxLegs ?? LEG_MAX;

  const profileValue = useMemo(
    () => resolveLoopProfileValue(planner, shipName),
    [planner, shipName],
  );

  const systemNames = useMemo(
    () => new Map(systems.map((s) => [s.id, s.name])),
    [systems],
  );

  const advancedSummary = useMemo(
    () => buildLoopPlannerSummary(planner, { stantonSystemId, systemNames }),
    [planner, stantonSystemId, systemNames],
  );

  const terminalOptions = useMemo(
    () =>
      [...terminals]
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((t) => ({ value: String(t.id), label: t.label })),
    [terminals],
  );

  const stantonOnly = isStantonOnly(planner, stantonSystemId);

  function handleMinLegsChange(next: number) {
    const clamped = clampLegs(next);
    onPlannerChange({ minLegs: clamped, maxLegs: Math.max(clamped, maxLegs) });
  }

  function handleMaxLegsChange(next: number) {
    const clamped = clampLegs(next);
    onPlannerChange({ maxLegs: clamped, minLegs: Math.min(clamped, minLegs) });
  }

  function handlePresetSelect(id: LoopPlannerPresetId) {
    const applied = applyLoopPlannerPreset(id, { planner, shipName }, mergeLoopPlannerInput);
    onShipChange(applied.shipName, applied.planner.shipScu ?? applied.planner.cargoScu);
    onPlannerReplace(applied.planner);
  }

  return (
    <div className="space-y-6">
      <LoopProfileSelect
        value={profileValue}
        disabled={disabled}
        onPresetSelect={handlePresetSelect}
      />

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Essentials
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ShipSelect
            shipName={shipName}
            ships={ships}
            loading={shipsLoading}
            onShipChange={onShipChange}
            disabled={disabled}
          />

          <div className="space-y-2">
            <Label htmlFor="lp-cargo">Cargo (SCU)</Label>
            <Input
              id="lp-cargo"
              type="number"
              min={1}
              max={planner.shipScu ?? undefined}
              disabled={disabled}
              value={planner.cargoScu}
              onChange={(e) =>
                onPlannerChange({ cargoScu: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            {planner.shipScu ? (
              <p className="text-xs text-muted-foreground">
                Using ship capacity: {planner.shipScu} SCU
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Custom cargo — enter SCU manually</p>
            )}
          </div>

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
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <PlannerToggle
            id="lp-same-system"
            label="Same system"
            checked={planner.sameSystemOnly ?? false}
            disabled={disabled}
            onChange={(checked) => onPlannerChange({ sameSystemOnly: checked })}
          />
          <PlannerToggle
            id="lp-stanton-only"
            label="Stanton only"
            checked={stantonOnly}
            disabled={disabled || stantonSystemId == null}
            onChange={(checked) => onPlannerChange(stantonOnlyPatch(checked, stantonSystemId))}
          />
          <PlannerToggle
            id="lp-exclude-illegal"
            label="Exclude illegal"
            checked={planner.excludeIllegal ?? false}
            disabled={disabled}
            onChange={(checked) => onPlannerChange({ excludeIllegal: checked })}
          />
        </div>
      </div>

      <CollapsibleSection title="Advanced search" summary={advancedSummary}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <Label htmlFor="lp-max-time">Max total time (search)</Label>
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

          <LoopSystemFilterPanel
            planner={planner}
            systems={systems}
            disabled={disabled}
            onPlannerChange={onPlannerChange}
          />

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <PlannerToggle
              id="lp-return-start"
              label="Return to start"
              checked={planner.returnToStart ?? true}
              disabled={disabled}
              onChange={(checked) => onPlannerChange({ returnToStart: checked })}
            />
            <PlannerToggle
              id="lp-mixed-commodities"
              label="Mixed commodities"
              checked={planner.allowMixedCommodities ?? true}
              disabled={disabled}
              onChange={(checked) => onPlannerChange({ allowMixedCommodities: checked })}
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
      </CollapsibleSection>
    </div>
  );
}

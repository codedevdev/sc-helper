import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  getQuantumSpeedClassLabel,
  type TradingShip,
} from "@/lib/trading-routes/ships";

const CUSTOM_CARGO_VALUE = "__none__";

interface ShipSelectProps {
  shipName: string;
  ships: TradingShip[];
  loading?: boolean;
  onShipChange: (name: string, scu: number) => void;
  disabled?: boolean;
}

export function ShipSelect({ shipName, ships, loading, onShipChange, disabled }: ShipSelectProps) {
  const options = useMemo(
    () =>
      [...ships]
        .sort((a, b) => a.scu - b.scu || a.name.localeCompare(b.name))
        .map((s) => ({
          value: s.name,
          label: `${s.name} (${s.scu} SCU) · ${getQuantumSpeedClassLabel(s.quantumSpeedClass)}`,
          keywords: `${s.scu} ${getQuantumSpeedClassLabel(s.quantumSpeedClass)}`,
        })),
    [ships],
  );

  const value = shipName || CUSTOM_CARGO_VALUE;
  const placeholder = loading ? "Loading ships…" : "Search ship…";

  return (
    <SearchableSelect
      label="Ship"
      value={value}
      options={options}
      placeholder={placeholder}
      emptyLabel={loading ? "Loading ships…" : "No ships found"}
      allOption={{ value: CUSTOM_CARGO_VALUE, label: "Custom cargo" }}
      disabled={disabled || loading}
      onValueChange={(v) => {
        if (v === CUSTOM_CARGO_VALUE) {
          onShipChange("", 0);
          return;
        }
        const ship = ships.find((s) => s.name === v);
        if (ship) onShipChange(ship.name, ship.scu);
      }}
    />
  );
}

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo } from "react";
import {
  getQuantumSpeedClassLabel,
  TRADING_SHIPS,
} from "@/lib/trading-routes/ships";

interface ShipSelectProps {
  shipName: string;
  onShipChange: (name: string, scu: number) => void;
  disabled?: boolean;
}

export function ShipSelect({ shipName, onShipChange, disabled }: ShipSelectProps) {
  const sortedShips = useMemo(
    () => [...TRADING_SHIPS].sort((a, b) => a.scu - b.scu),
    [],
  );
  return (
    <div className="space-y-2">
      <Label>Ship</Label>
      <Select
        value={shipName || "__none__"}
        disabled={disabled}
        onValueChange={(v) => {
          if (v === "__none__") {
            onShipChange("", 0);
            return;
          }
          const ship = sortedShips.find((s) => s.name === v);
          if (ship) onShipChange(ship.name, ship.scu);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose ship" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Custom cargo</SelectItem>
          {sortedShips.map((s) => (
            <SelectItem key={s.name} value={s.name}>
              <span>
                {s.name} ({s.scu} SCU)
                <span className="ml-1.5 text-muted-foreground">
                  · {getQuantumSpeedClassLabel(s.quantumSpeedClass)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

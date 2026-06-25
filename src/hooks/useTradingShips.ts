import { useCallback, useEffect, useState } from "react";
import { fetchCargoVehiclesForShips } from "@/lib/uex/endpoints";
import {
  fetchCargoShipsFromUex,
  getTradingShipsList,
  TRADING_SHIPS,
  type TradingShip,
} from "@/lib/trading-routes/ships";

type ShipsStatus = "loading" | "ready" | "error";

export function useTradingShips() {
  const [ships, setShips] = useState<TradingShip[]>(() => getTradingShipsList());
  const [status, setStatus] = useState<ShipsStatus>("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const list = await fetchCargoShipsFromUex(fetchCargoVehiclesForShips);
      setShips(list);
      setStatus("ready");
    } catch {
      setShips(TRADING_SHIPS);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ships, status, refetch: load };
}

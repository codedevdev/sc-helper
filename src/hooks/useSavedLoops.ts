import { useCallback, useEffect, useState } from "react";
import {
  deleteLoop as dbDelete,
  getSavedLoops as dbList,
  renameLoop as dbRename,
  saveLoop as dbSave,
} from "@/db/saved-loops";
import type { LoopPlannerInput, SavedTradeLoop, TradeLoop } from "@/types/trading-route";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export function useSavedLoops() {
  const [savedLoops, setSavedLoops] = useState<SavedTradeLoop[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const list = await dbList();
      setSavedLoops(list);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load saved loops");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveLoop = useCallback(
    async (loop: TradeLoop, name?: string, planner?: LoopPlannerInput) => {
      const saved = await dbSave(loop, name, planner);
      await load();
      return saved;
    },
    [load],
  );

  const renameLoop = useCallback(
    async (id: string, name: string) => {
      const updated = await dbRename(id, name);
      await load();
      return updated;
    },
    [load],
  );

  const deleteLoop = useCallback(
    async (id: string) => {
      await dbDelete(id);
      await load();
    },
    [load],
  );

  return {
    savedLoops,
    status,
    error,
    load,
    saveLoop,
    renameLoop,
    deleteLoop,
  };
}

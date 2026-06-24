import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  createFarmingSession as dbCreate,
  deleteFarmingSession as dbDelete,
  listFarmingSessions as dbList,
  updateFarmingSession as dbUpdate,
} from "@/db/farming-sessions";
import { computeNetProfit } from "@/lib/farming-session-calculations";
import type { FarmingSession, FarmingSessionInput } from "@/types/farming-session";

const STORAGE_KEY = "sc-trader-farming-sessions";

type LoadStatus = "idle" | "loading" | "ready" | "error";

function readBrowserSessions(): FarmingSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FarmingSession[];
  } catch {
    return [];
  }
}

function writeBrowserSessions(sessions: FarmingSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function buildBrowserSession(input: FarmingSessionInput, id?: string): FarmingSession {
  const now = new Date().toISOString();
  return {
    id: id ?? crypto.randomUUID(),
    title: input.title,
    activityType: input.activityType,
    shipUsed: input.shipUsed,
    startBalance: input.startBalance,
    endBalance: input.endBalance,
    expenses: input.expenses,
    netProfit: computeNetProfit(input.startBalance, input.endBalance, input.expenses),
    durationMinutes: input.durationMinutes,
    location: input.location,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function useFarmingSessions() {
  const [sessions, setSessions] = useState<FarmingSession[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      if (!isTauri()) {
        const list = readBrowserSessions();
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setSessions(list);
        setStatus("ready");
        return;
      }

      const list = await dbList();
      setSessions(list);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load farming sessions");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (input: FarmingSessionInput) => {
      if (!isTauri()) {
        const session = buildBrowserSession(input);
        const list = [session, ...readBrowserSessions()];
        writeBrowserSessions(list);
        await load();
        return session;
      }

      const created = await dbCreate(input);
      await load();
      return created;
    },
    [load],
  );

  const update = useCallback(
    async (id: string, input: FarmingSessionInput) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const list = readBrowserSessions().map((s) =>
          s.id === id
            ? {
                ...buildBrowserSession(input, id),
                createdAt: s.createdAt,
                updatedAt: now,
              }
            : s,
        );
        writeBrowserSessions(list);
        await load();
        return list.find((s) => s.id === id)!;
      }

      const updated = await dbUpdate(id, input);
      await load();
      return updated;
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!isTauri()) {
        const list = readBrowserSessions().filter((s) => s.id !== id);
        writeBrowserSessions(list);
        await load();
        return;
      }

      await dbDelete(id);
      await load();
    },
    [load],
  );

  return {
    sessions,
    status,
    error,
    reload: load,
    create,
    update,
    remove,
  };
}

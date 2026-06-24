import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  createGoal as dbCreate,
  deleteGoal as dbDelete,
  listGoals as dbList,
  markGoalComplete as dbMarkComplete,
  updateGoal as dbUpdate,
} from "@/db/goals";
import type { Goal, GoalInput } from "@/types/goal";

const STORAGE_KEY = "sc-trader-goals";

type LoadStatus = "idle" | "loading" | "ready" | "error";

function readBrowserGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Goal[];
  } catch {
    return [];
  }
}

function writeBrowserGoals(goals: Goal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function buildBrowserGoal(input: GoalInput, existing?: Goal): Goal {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    title: input.title,
    targetAmount: input.targetAmount,
    currentAmountSnapshot: existing?.currentAmountSnapshot ?? 0,
    isCompleted: existing?.isCompleted ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    completedAt: existing?.completedAt ?? null,
  };
}

function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      if (!isTauri()) {
        setGoals(sortGoals(readBrowserGoals()));
        setStatus("ready");
        return;
      }

      const list = await dbList();
      setGoals(list);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load goals");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (input: GoalInput) => {
      if (!isTauri()) {
        const goal = buildBrowserGoal(input);
        const list = sortGoals([goal, ...readBrowserGoals()]);
        writeBrowserGoals(list);
        await load();
        return goal;
      }

      const created = await dbCreate(input);
      await load();
      return created;
    },
    [load],
  );

  const update = useCallback(
    async (id: string, input: GoalInput) => {
      if (!isTauri()) {
        const list = readBrowserGoals().map((g) =>
          g.id === id ? buildBrowserGoal(input, g) : g,
        );
        writeBrowserGoals(sortGoals(list));
        await load();
        return list.find((g) => g.id === id)!;
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
        const list = readBrowserGoals().filter((g) => g.id !== id);
        writeBrowserGoals(list);
        await load();
        return;
      }

      await dbDelete(id);
      await load();
    },
    [load],
  );

  const markComplete = useCallback(
    async (id: string, currentBalance: number) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const list = readBrowserGoals().map((g) =>
          g.id === id
            ? {
                ...g,
                isCompleted: true,
                completedAt: now,
                currentAmountSnapshot: currentBalance,
                updatedAt: now,
              }
            : g,
        );
        writeBrowserGoals(sortGoals(list));
        await load();
        return list.find((g) => g.id === id)!;
      }

      const completed = await dbMarkComplete(id, currentBalance);
      await load();
      return completed;
    },
    [load],
  );

  return {
    goals,
    status,
    error,
    reload: load,
    create,
    update,
    remove,
    markComplete,
  };
}

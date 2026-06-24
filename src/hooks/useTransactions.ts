import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  createTransaction as dbCreate,
  deleteTransaction as dbDelete,
  getTransactionTotals as dbGetTotals,
  listTransactions as dbList,
  updateTransaction as dbUpdate,
} from "@/db/transactions";
import type { TransactionTotals } from "@/db/transactions";
import type { Transaction, TransactionInput } from "@/types/transaction";

const STORAGE_KEY = "sc-trader-transactions";

type LoadStatus = "idle" | "loading" | "ready" | "error";

const EMPTY_TOTALS: TransactionTotals = {
  totalIncome: 0,
  totalExpenses: 0,
  totalAdjustments: 0,
};

function readBrowserTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

function writeBrowserTransactions(transactions: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function computeBrowserTotals(transactions: Transaction[]): TransactionTotals {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalAdjustments = 0;

  for (const t of transactions) {
    switch (t.type) {
      case "income":
        totalIncome += t.amount;
        break;
      case "expense":
        totalExpenses += t.amount;
        break;
      case "adjustment":
        totalAdjustments += t.amount;
        break;
    }
  }

  return { totalIncome, totalExpenses, totalAdjustments };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState<TransactionTotals>(EMPTY_TOTALS);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      if (!isTauri()) {
        const list = readBrowserTransactions();
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setTransactions(list);
        setTotals(computeBrowserTotals(list));
        setStatus("ready");
        return;
      }

      const [list, agg] = await Promise.all([dbList(), dbGetTotals()]);
      setTransactions(list);
      setTotals(agg);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (input: TransactionInput) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const createdAt = input.date || now;
        const transaction: Transaction = {
          id: crypto.randomUUID(),
          type: input.type,
          category: input.category,
          amount: input.amount,
          title: input.title,
          description: input.description,
          activityType: input.activityType,
          shipUsed: input.shipUsed,
          location: input.location,
          createdAt,
          updatedAt: now,
        };
        const list = [transaction, ...readBrowserTransactions()];
        writeBrowserTransactions(list);
        await load();
        return transaction;
      }

      const created = await dbCreate(input);
      await load();
      return created;
    },
    [load],
  );

  const update = useCallback(
    async (id: string, input: TransactionInput) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const list = readBrowserTransactions().map((t) =>
          t.id === id
            ? {
                ...t,
                type: input.type,
                category: input.category,
                amount: input.amount,
                title: input.title,
                description: input.description,
                activityType: input.activityType,
                shipUsed: input.shipUsed,
                location: input.location,
                createdAt: input.date,
                updatedAt: now,
              }
            : t,
        );
        writeBrowserTransactions(list);
        await load();
        return list.find((t) => t.id === id)!;
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
        const list = readBrowserTransactions().filter((t) => t.id !== id);
        writeBrowserTransactions(list);
        await load();
        return;
      }

      await dbDelete(id);
      await load();
    },
    [load],
  );

  return {
    transactions,
    totals,
    status,
    error,
    reload: load,
    create,
    update,
    remove,
  };
}

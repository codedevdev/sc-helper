import { isTauri } from "@tauri-apps/api/core";
import { getDatabase } from "./client";
import type { UexMarketData } from "@/lib/uex/types";

const BROWSER_SNAPSHOT_KEY = "sc-trader.uex-snapshot";

interface SnapshotRow {
  payload: string;
  fetched_at: string;
  updated_at: string;
}

function isValidMarketData(data: unknown): data is UexMarketData {
  if (!data || typeof data !== "object") return false;
  const d = data as UexMarketData;
  return (
    Array.isArray(d.prices) &&
    Array.isArray(d.terminals) &&
    Array.isArray(d.commodities) &&
    typeof d.fetchedAt === "string"
  );
}

export async function saveUexPriceSnapshot(data: UexMarketData): Promise<void> {
  const payload = JSON.stringify(data);
  const now = new Date().toISOString();

  if (!isTauri()) {
    try {
      localStorage.setItem(
        BROWSER_SNAPSHOT_KEY,
        JSON.stringify({ payload, fetchedAt: data.fetchedAt, updatedAt: now }),
      );
    } catch {
      // ignore quota
    }
    return;
  }

  const db = await getDatabase();
  await db.execute(
    `INSERT OR REPLACE INTO uex_price_snapshots (id, payload, fetched_at, updated_at)
     VALUES (1, ?, ?, ?)`,
    [payload, data.fetchedAt, now],
  );
}

export async function loadUexPriceSnapshot(): Promise<UexMarketData | null> {
  if (!isTauri()) {
    try {
      const raw = localStorage.getItem(BROWSER_SNAPSHOT_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw) as { payload: string };
      const parsed = JSON.parse(stored.payload) as unknown;
      return isValidMarketData(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  const db = await getDatabase();
  const rows = await db.select<SnapshotRow[]>(
    `SELECT payload, fetched_at, updated_at FROM uex_price_snapshots WHERE id = 1`,
  );
  const row = rows[0];
  if (!row?.payload) return null;

  try {
    const parsed = JSON.parse(row.payload) as unknown;
    if (!isValidMarketData(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearUexPriceSnapshots(): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(BROWSER_SNAPSHOT_KEY);
    return;
  }

  const db = await getDatabase();
  await db.execute(`DELETE FROM uex_price_snapshots WHERE id = 1`);
}

import { isTauri } from "@tauri-apps/api/core";
import { formatAuec } from "@/lib/formatAuec";
import { getDatabase } from "./client";
import type {
  LoopPlannerInput,
  SavedTradeLoop,
  TradeLoop,
} from "@/types/trading-route";

const BROWSER_STORAGE_KEY = "sc-trader.saved-trade-loops";

interface SavedTradeLoopRow {
  id: string;
  name: string;
  legs_json: string;
  planner_json: string | null;
  total_profit: number;
  profit_per_min: number;
  leg_count: number;
  created_at: string;
}

const SELECT_COLUMNS = `
  id, name, legs_json, planner_json, total_profit, profit_per_min, leg_count, created_at
`;

function isValidTradeLoop(data: unknown): data is TradeLoop {
  if (!data || typeof data !== "object") return false;
  const loop = data as TradeLoop;
  return (
    typeof loop.id === "string" &&
    Array.isArray(loop.legs) &&
    typeof loop.totalProfit === "number" &&
    typeof loop.profitPerMin === "number" &&
    typeof loop.totalTime === "number"
  );
}

function parsePlannerJson(raw: string | null): LoopPlannerInput | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as LoopPlannerInput;
  } catch {
    return undefined;
  }
}

function parseLegsJson(raw: string): TradeLoop | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValidTradeLoop(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function mapRow(row: SavedTradeLoopRow): SavedTradeLoop | null {
  const loop = parseLegsJson(row.legs_json);
  if (!loop) return null;

  return {
    id: row.id,
    name: row.name,
    loop,
    planner: parsePlannerJson(row.planner_json),
    totalProfit: row.total_profit,
    profitPerMin: row.profit_per_min,
    legCount: row.leg_count,
    createdAt: row.created_at,
  };
}

function hopCount(loop: TradeLoop): number {
  return loop.legs.filter((leg) => leg.action === "buy").length;
}

function defaultLoopName(loop: TradeLoop): string {
  const hops = hopCount(loop);
  const startTerminal = loop.legs[0]?.terminal.terminal ?? "Unknown";
  return `+${formatAuec(loop.totalProfit)} · ${hops} legs · ${startTerminal}`;
}

function readBrowserSavedLoops(): SavedTradeLoop[] {
  try {
    const raw = localStorage.getItem(BROWSER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTradeLoop[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => isValidTradeLoop(item.loop));
  } catch {
    return [];
  }
}

function writeBrowserSavedLoops(loops: SavedTradeLoop[]): void {
  try {
    localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(loops));
  } catch {
    // ignore quota errors
  }
}

function sortSavedLoops(loops: SavedTradeLoop[]): SavedTradeLoop[] {
  return [...loops].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getSavedLoops(): Promise<SavedTradeLoop[]> {
  if (!isTauri()) {
    return sortSavedLoops(readBrowserSavedLoops());
  }

  const db = await getDatabase();
  const rows = await db.select<SavedTradeLoopRow[]>(
    `SELECT ${SELECT_COLUMNS}
     FROM saved_trade_loops
     ORDER BY created_at DESC`,
  );

  return rows.map(mapRow).filter((item): item is SavedTradeLoop => item != null);
}

export async function saveLoop(
  loop: TradeLoop,
  name?: string,
  planner?: LoopPlannerInput,
): Promise<SavedTradeLoop> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const legCount = hopCount(loop);
  const trimmedName = name?.trim() || defaultLoopName(loop);
  const legsJson = JSON.stringify(loop);
  const plannerJson = planner ? JSON.stringify(planner) : null;

  const saved: SavedTradeLoop = {
    id,
    name: trimmedName,
    loop,
    planner,
    totalProfit: loop.totalProfit,
    profitPerMin: loop.profitPerMin,
    legCount,
    createdAt: now,
  };

  if (!isTauri()) {
    const list = sortSavedLoops([saved, ...readBrowserSavedLoops()]);
    writeBrowserSavedLoops(list);
    return saved;
  }

  const db = await getDatabase();
  await db.execute(
    `INSERT INTO saved_trade_loops (
      id, name, legs_json, planner_json, total_profit, profit_per_min, leg_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      trimmedName,
      legsJson,
      plannerJson,
      loop.totalProfit,
      loop.profitPerMin,
      legCount,
      now,
    ],
  );

  return saved;
}

export async function deleteLoop(id: string): Promise<void> {
  if (!isTauri()) {
    const list = readBrowserSavedLoops().filter((item) => item.id !== id);
    writeBrowserSavedLoops(list);
    return;
  }

  const db = await getDatabase();
  await db.execute(`DELETE FROM saved_trade_loops WHERE id = ?`, [id]);
}

export async function renameLoop(id: string, name: string): Promise<SavedTradeLoop> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Loop name cannot be empty");
  }

  if (!isTauri()) {
    const list = readBrowserSavedLoops();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error("Saved loop not found");
    }
    const updated = { ...list[index], name: trimmedName };
    list[index] = updated;
    writeBrowserSavedLoops(list);
    return updated;
  }

  const db = await getDatabase();
  await db.execute(`UPDATE saved_trade_loops SET name = ? WHERE id = ?`, [
    trimmedName,
    id,
  ]);

  const rows = await db.select<SavedTradeLoopRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM saved_trade_loops WHERE id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("Saved loop not found");
  }

  const mapped = mapRow(row);
  if (!mapped) {
    throw new Error("Failed to load saved loop");
  }

  return mapped;
}

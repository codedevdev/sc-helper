import { getDatabase } from "./client";
import { computeNetProfit } from "@/lib/farming-session-calculations";
import type { FarmingSession, FarmingSessionInput } from "@/types/farming-session";

interface FarmingSessionRow {
  id: string;
  title: string;
  activity_type: string;
  ship_used: string;
  start_balance: number;
  end_balance: number;
  expenses: number;
  net_profit: number;
  duration_minutes: number;
  location: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: FarmingSessionRow): FarmingSession {
  return {
    id: row.id,
    title: row.title,
    activityType: row.activity_type as FarmingSession["activityType"],
    shipUsed: row.ship_used,
    startBalance: row.start_balance,
    endBalance: row.end_balance,
    expenses: row.expenses,
    netProfit: row.net_profit,
    durationMinutes: row.duration_minutes,
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `
  id, title, activity_type, ship_used, start_balance, end_balance,
  expenses, net_profit, duration_minutes, location, notes, created_at, updated_at
`;

export async function listFarmingSessions(): Promise<FarmingSession[]> {
  const db = await getDatabase();
  const rows = await db.select<FarmingSessionRow[]>(
    `SELECT ${SELECT_COLUMNS}
     FROM farming_sessions
     ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function createFarmingSession(input: FarmingSessionInput): Promise<FarmingSession> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const netProfit = computeNetProfit(input.startBalance, input.endBalance, input.expenses);

  await db.execute(
    `INSERT INTO farming_sessions (
      id, title, activity_type, ship_used, start_balance, end_balance,
      expenses, net_profit, duration_minutes, location, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.activityType,
      input.shipUsed,
      input.startBalance,
      input.endBalance,
      input.expenses,
      netProfit,
      input.durationMinutes,
      input.location,
      input.notes,
      now,
      now,
    ],
  );

  const rows = await db.select<FarmingSessionRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM farming_sessions WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create farming session");
  }

  return mapRow(row);
}

export async function updateFarmingSession(
  id: string,
  input: FarmingSessionInput,
): Promise<FarmingSession> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const netProfit = computeNetProfit(input.startBalance, input.endBalance, input.expenses);

  await db.execute(
    `UPDATE farming_sessions SET
      title = ?,
      activity_type = ?,
      ship_used = ?,
      start_balance = ?,
      end_balance = ?,
      expenses = ?,
      net_profit = ?,
      duration_minutes = ?,
      location = ?,
      notes = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      input.title,
      input.activityType,
      input.shipUsed,
      input.startBalance,
      input.endBalance,
      input.expenses,
      netProfit,
      input.durationMinutes,
      input.location,
      input.notes,
      now,
      id,
    ],
  );

  const rows = await db.select<FarmingSessionRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM farming_sessions WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Farming session not found");
  }

  return mapRow(row);
}

export async function deleteFarmingSession(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM farming_sessions WHERE id = ?`, [id]);
}

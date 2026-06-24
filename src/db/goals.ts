import { getDatabase } from "./client";
import type { Goal, GoalInput } from "@/types/goal";

interface GoalRow {
  id: string;
  title: string;
  target_amount: number;
  current_amount_snapshot: number;
  is_completed: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function mapRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    targetAmount: row.target_amount,
    currentAmountSnapshot: row.current_amount_snapshot,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

const SELECT_COLUMNS = `
  id, title, target_amount, current_amount_snapshot, is_completed,
  created_at, updated_at, completed_at
`;

export async function listGoals(): Promise<Goal[]> {
  const db = await getDatabase();
  const rows = await db.select<GoalRow[]>(
    `SELECT ${SELECT_COLUMNS}
     FROM goals
     ORDER BY is_completed ASC, created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO goals (
      id, title, target_amount, current_amount_snapshot, is_completed,
      created_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.title, input.targetAmount, 0, 0, now, now, null],
  );

  const rows = await db.select<GoalRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM goals WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create goal");
  }

  return mapRow(row);
}

export async function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE goals SET
      title = ?,
      target_amount = ?,
      updated_at = ?
     WHERE id = ?`,
    [input.title, input.targetAmount, now, id],
  );

  const rows = await db.select<GoalRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM goals WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Goal not found");
  }

  return mapRow(row);
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM goals WHERE id = ?`, [id]);
}

export async function markGoalComplete(id: string, currentBalance: number): Promise<Goal> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE goals SET
      is_completed = 1,
      completed_at = ?,
      current_amount_snapshot = ?,
      updated_at = ?
     WHERE id = ?`,
    [now, currentBalance, now, id],
  );

  const rows = await db.select<GoalRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM goals WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Goal not found");
  }

  return mapRow(row);
}

import { getDatabase } from "./client";
import type { Transaction, TransactionInput } from "@/types/transaction";

interface TransactionRow {
  id: string;
  type: string;
  category: string;
  amount: number;
  title: string;
  description: string;
  activity_type: string;
  ship_used: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionTotals {
  totalIncome: number;
  totalExpenses: number;
  totalAdjustments: number;
}

function mapRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction["type"],
    category: row.category,
    amount: row.amount,
    title: row.title,
    description: row.description,
    activityType: row.activity_type,
    shipUsed: row.ship_used,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `
  id, type, category, amount, title, description,
  activity_type, ship_used, location, created_at, updated_at
`;

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDatabase();
  const rows = await db.select<TransactionRow[]>(
    `SELECT ${SELECT_COLUMNS}
     FROM transactions
     ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const createdAt = input.date || now;

  await db.execute(
    `INSERT INTO transactions (
      id, type, category, amount, title, description,
      activity_type, ship_used, location, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.type,
      input.category,
      input.amount,
      input.title,
      input.description,
      input.activityType,
      input.shipUsed,
      input.location,
      createdAt,
      now,
    ],
  );

  const rows = await db.select<TransactionRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM transactions WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create transaction");
  }

  return mapRow(row);
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE transactions SET
      type = ?,
      category = ?,
      amount = ?,
      title = ?,
      description = ?,
      activity_type = ?,
      ship_used = ?,
      location = ?,
      created_at = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      input.type,
      input.category,
      input.amount,
      input.title,
      input.description,
      input.activityType,
      input.shipUsed,
      input.location,
      input.date,
      now,
      id,
    ],
  );

  const rows = await db.select<TransactionRow[]>(
    `SELECT ${SELECT_COLUMNS} FROM transactions WHERE id = ?`,
    [id],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Transaction not found");
  }

  return mapRow(row);
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function getTransactionTotals(): Promise<TransactionTotals> {
  const db = await getDatabase();
  const rows = await db.select<{ type: string; total: number }[]>(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     GROUP BY type`,
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalAdjustments = 0;

  for (const row of rows) {
    switch (row.type) {
      case "income":
        totalIncome = row.total;
        break;
      case "expense":
        totalExpenses = row.total;
        break;
      case "adjustment":
        totalAdjustments = row.total;
        break;
    }
  }

  return { totalIncome, totalExpenses, totalAdjustments };
}

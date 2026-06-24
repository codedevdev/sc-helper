import Database from "@tauri-apps/plugin-sql";

export const DB_CONNECTION = "sqlite:profit_tracker.db";

let database: Database | null = null;
let loadPromise: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
  if (database) {
    return database;
  }

  if (!loadPromise) {
    loadPromise = Database.load(DB_CONNECTION).then((db) => {
      database = db;
      return db;
    });
  }

  return loadPromise;
}

export async function pingDatabase(): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.select<{ ok: number }[]>("SELECT 1 AS ok");
  return rows.length > 0 && rows[0]?.ok === 1;
}

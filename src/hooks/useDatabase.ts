import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { pingDatabase } from "@/db";

export type DatabaseStatus = "idle" | "loading" | "ready" | "error" | "skipped";

export function useDatabase() {
  const [status, setStatus] = useState<DatabaseStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!isTauri()) {
        setStatus("skipped");
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        const ok = await pingDatabase();
        if (cancelled) return;

        if (ok) {
          setStatus("ready");
          if (import.meta.env.DEV) {
            console.info("[db] SQLite ready (profit_tracker.db)");
          }
        } else {
          setStatus("error");
          setError("Database ping failed");
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to initialize database");
        console.error("[db] init error:", err);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, error };
}

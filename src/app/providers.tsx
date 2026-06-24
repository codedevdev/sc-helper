import type { ReactNode } from "react";
import { useDatabase } from "@/hooks/useDatabase";

export function AppProviders({ children }: { children: ReactNode }) {
  const { status, error } = useDatabase();

  return (
    <>
      {children}
      {import.meta.env.DEV && status === "skipped" && (
        <div
          className="pointer-events-none fixed bottom-3 right-3 z-50 rounded-md border border-border bg-card/90 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm"
          aria-hidden
        >
          Browser preview (run npm run tauri:dev for DB)
        </div>
      )}
      {import.meta.env.DEV && status === "ready" && (
        <div
          className="pointer-events-none fixed bottom-3 right-3 z-50 rounded-md border border-primary/30 bg-card/90 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm"
          aria-hidden
        >
          Database ready
        </div>
      )}
      {import.meta.env.DEV && status === "error" && (
        <div
          className="pointer-events-none fixed bottom-3 right-3 z-50 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1 text-xs text-destructive backdrop-blur-sm"
          aria-hidden
        >
          DB: {error ?? "error"}
        </div>
      )}
    </>
  );
}

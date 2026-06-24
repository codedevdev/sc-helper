interface SearchDiagnosticsProps {
  searchMs?: number | null;
  resultCount?: number;
  exploredNodes?: number | null;
  truncated?: boolean;
  edgeCount?: number | null;
  mode: "single" | "loop" | "en-route";
}

export function SearchDiagnostics({
  searchMs,
  resultCount,
  exploredNodes,
  truncated,
  edgeCount,
  mode,
}: SearchDiagnosticsProps) {
  const showDev =
    import.meta.env.DEV ||
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("sc-trader.search-diagnostics") === "1");

  if (!showDev) return null;

  return (
    <details className="mt-4 rounded-md border border-dashed border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium">Search diagnostics</summary>
      <ul className="mt-2 space-y-1">
        <li>Mode: {mode}</li>
        {searchMs != null && <li>Search time: {searchMs} ms</li>}
        {resultCount != null && <li>Results: {resultCount}</li>}
        {exploredNodes != null && <li>Nodes explored: {exploredNodes.toLocaleString()}</li>}
        {edgeCount != null && <li>Graph edges: {edgeCount.toLocaleString()}</li>}
        {truncated != null && <li>Truncated: {truncated ? "yes" : "no"}</li>}
      </ul>
    </details>
  );
}

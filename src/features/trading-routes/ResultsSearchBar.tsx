import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResultsSearchBarProps {
  query: string;
  filteredCount: number;
  totalCount: number;
  placeholder?: string;
  onQueryChange: (query: string) => void;
  onClear?: () => void;
}

export function ResultsSearchBar({
  query,
  filteredCount,
  totalCount,
  placeholder = "Filter results…",
  onQueryChange,
  onClear,
}: ResultsSearchBarProps) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder={placeholder}
          className="pl-9"
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {hasQuery && (
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        Showing {filteredCount} of {totalCount}
      </p>
      {onClear && hasQuery && (
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

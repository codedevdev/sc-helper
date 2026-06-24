import { useState } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatAuec } from "@/lib/formatAuec";
import { cn } from "@/lib/utils";
import type { SavedTradeLoop } from "@/types/trading-route";
import { buildLoopChecklistText } from "./loop-checklist";
import { RenameLoopDialog } from "./RenameLoopDialog";

interface SavedLoopsPanelProps {
  savedLoops: SavedTradeLoop[];
  onOpen: (saved: SavedTradeLoop) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SavedLoopsPanel({
  savedLoops,
  onOpen,
  onRename,
  onDelete,
}: SavedLoopsPanelProps) {
  const [expanded, setExpanded] = useState(savedLoops.length > 0);
  const [renameTarget, setRenameTarget] = useState<SavedTradeLoop | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(saved: SavedTradeLoop) {
    const ok = await copyToClipboard(buildLoopChecklistText(saved.loop));
    if (ok) {
      setCopiedId(saved.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function handleDelete(saved: SavedTradeLoop) {
    const confirmed = window.confirm(`Delete saved loop "${saved.name}"?`);
    if (!confirmed) return;
    await onDelete(saved.id);
  }

  async function handleRename(name: string) {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      await onRename(renameTarget.id, name);
    } finally {
      setRenaming(false);
    }
  }

  return (
    <>
      <Card className="mb-6 border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Bookmark className="size-4 text-muted-foreground" />
            Saved loops ({savedLoops.length})
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse saved loops" : "Expand saved loops"}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0">
            {savedLoops.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved loops"
                description="Open a loop from search results and click Save loop to keep it here."
              />
            ) : (
              <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                {savedLoops.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{saved.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                        <span className="text-emerald-400/90">
                          +{formatAuec(saved.totalProfit)}
                        </span>
                        <span>{saved.legCount} legs</span>
                        <span>{new Date(saved.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Open detail"
                        onClick={() => onOpen(saved)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Rename"
                        onClick={() => setRenameTarget(saved)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-8",
                          copiedId === saved.id && "text-emerald-400",
                        )}
                        title="Copy checklist"
                        onClick={() => void handleCopy(saved)}
                      >
                        {copiedId === saved.id ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => void handleDelete(saved)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <RenameLoopDialog
        open={renameTarget != null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        currentName={renameTarget?.name ?? ""}
        onRename={handleRename}
        saving={renaming}
      />
    </>
  );
}

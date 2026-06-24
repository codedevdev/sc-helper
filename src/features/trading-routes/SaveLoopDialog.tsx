import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialogBody } from "@/components/shared/FormDialogBody";
import { formatAuec } from "@/lib/formatAuec";
import type { TradeLoop } from "@/types/trading-route";
import { loopHopCount } from "./loop-checklist";

interface SaveLoopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loop: TradeLoop | null;
  onSave: (name: string) => Promise<void>;
  saving?: boolean;
}

function defaultLoopName(loop: TradeLoop): string {
  const hops = loopHopCount(loop);
  const startTerminal = loop.legs[0]?.terminal.terminal ?? "Unknown";
  return `+${formatAuec(loop.totalProfit)} · ${hops} legs · ${startTerminal}`;
}

export function SaveLoopDialog({
  open,
  onOpenChange,
  loop,
  onSave,
  saving,
}: SaveLoopDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !loop) return;
    setName(defaultLoopName(loop));
    setError(null);
  }, [open, loop]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setError(null);
    try {
      await onSave(trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save loop");
    }
  }

  if (!loop) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save loop</DialogTitle>
          <DialogDescription>
            Save this trade loop to revisit later from Saved loops.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <FormDialogBody className="space-y-4 px-1">
            <div className="space-y-2">
              <Label htmlFor="save-loop-name">Name</Label>
              <Input
                id="save-loop-name"
                value={name}
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </FormDialogBody>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save loop"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

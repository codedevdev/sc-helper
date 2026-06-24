import { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/FormField";
import { FormDialogBody } from "@/components/shared/FormDialogBody";
import { computeNetProfit } from "@/lib/farming-session-calculations";
import { formatSignedAuec } from "@/lib/formatNetProfit";
import { mapFarmingSessionFieldError } from "@/lib/mapValidationError";
import { validateFarmingSessionForm } from "@/lib/validateFarmingSession";
import { cn } from "@/lib/utils";
import { ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPE } from "@/types/activity-types";
import type { FarmingSession, FarmingSessionInput } from "@/types/farming-session";

interface FarmingSessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: FarmingSession | null;
  defaults?: FarmingSessionFormDefaults;
  onSubmit: (input: FarmingSessionInput, createTransaction: boolean) => Promise<void>;
}

const emptyForm = {
  title: "",
  activityType: DEFAULT_ACTIVITY_TYPE,
  shipUsed: "",
  startBalance: "",
  endBalance: "",
  expenses: "",
  durationMinutes: "",
  location: "",
  notes: "",
};

export type FarmingSessionFormDefaults = Partial<typeof emptyForm>;

export function FarmingSessionFormDialog({
  open,
  onOpenChange,
  session,
  defaults,
  onSubmit,
}: FarmingSessionFormDialogProps) {
  const isEdit = Boolean(session);
  const [form, setForm] = useState(emptyForm);
  const [createTransaction, setCreateTransaction] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (session) {
      setForm({
        title: session.title,
        activityType: session.activityType,
        shipUsed: session.shipUsed,
        startBalance: String(session.startBalance),
        endBalance: String(session.endBalance),
        expenses: String(session.expenses),
        durationMinutes: String(session.durationMinutes),
        location: session.location,
        notes: session.notes,
      });
    } else {
      setForm({ ...emptyForm, ...defaults });
      setCreateTransaction(false);
    }
    setFieldErrors({});
    setGlobalError(null);
  }, [open, session, defaults]);

  const previewNetProfit = (() => {
    const start = Number(form.startBalance);
    const end = Number(form.endBalance);
    const expenses = form.expenses.trim() ? Number(form.expenses) : 0;
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(expenses)) {
      return null;
    }
    return computeNetProfit(start, end, expenses);
  })();

  function fieldError(id: string): string | undefined {
    return fieldErrors[id];
  }

  async function handleSubmit() {
    const validation = validateFarmingSessionForm({
      ...form,
      activityType: form.activityType,
    });
    if (!validation.valid || !validation.value) {
      const msg = validation.error ?? "Invalid form.";
      const field = mapFarmingSessionFieldError(msg);
      if (field) {
        setFieldErrors({ [field]: msg });
        setGlobalError(null);
      } else {
        setFieldErrors({});
        setGlobalError(msg);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(validation.value, createTransaction);
      onOpenChange(false);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit session" : "Add Session"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Transactions are only created when you first save a new session."
              : "Track balances and expenses from a farming run."}
          </DialogDescription>
        </DialogHeader>

        <FormDialogBody>
          <div className="grid gap-5 py-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Session details
          </p>

          <FormField label="Title" htmlFor="session-title" error={fieldError("title")}>
            <Input
              id="session-title"
              placeholder="e.g. Stanton salvage run"
              value={form.title}
              aria-invalid={Boolean(fieldError("title"))}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Activity type" error={fieldError("activityType")}>
              <Select
                value={form.activityType}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    activityType: v as typeof form.activityType,
                  }))
                }
              >
                <SelectTrigger
                  className={cn("w-full", fieldError("activityType") && "border-destructive")}
                  aria-invalid={Boolean(fieldError("activityType"))}
                >
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Ship used" htmlFor="session-ship" description="Optional">
              <Input
                id="session-ship"
                placeholder="e.g. Vulture"
                value={form.shipUsed}
                onChange={(e) => setForm((prev) => ({ ...prev, shipUsed: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Start balance (aUEC)"
              htmlFor="session-start"
              description="Balance before the run"
              error={fieldError("startBalance")}
            >
              <Input
                id="session-start"
                inputMode="decimal"
                placeholder="e.g. 100000"
                value={form.startBalance}
                aria-invalid={Boolean(fieldError("startBalance"))}
                onChange={(e) => setForm((prev) => ({ ...prev, startBalance: e.target.value }))}
              />
            </FormField>

            <FormField
              label="End balance (aUEC)"
              htmlFor="session-end"
              description="Balance after the run"
              error={fieldError("endBalance")}
            >
              <Input
                id="session-end"
                inputMode="decimal"
                placeholder="e.g. 250000"
                value={form.endBalance}
                aria-invalid={Boolean(fieldError("endBalance"))}
                onChange={(e) => setForm((prev) => ({ ...prev, endBalance: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Expenses (aUEC)"
              htmlFor="session-expenses"
              description="Fuel, repairs, etc."
              error={fieldError("expenses")}
            >
              <Input
                id="session-expenses"
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={form.expenses}
                aria-invalid={Boolean(fieldError("expenses"))}
                onChange={(e) => setForm((prev) => ({ ...prev, expenses: e.target.value }))}
              />
            </FormField>

            <FormField
              label="Duration (minutes)"
              htmlFor="session-duration"
              description="Used for profit/hour"
              error={fieldError("durationMinutes")}
            >
              <Input
                id="session-duration"
                inputMode="numeric"
                placeholder="e.g. 120"
                value={form.durationMinutes}
                aria-invalid={Boolean(fieldError("durationMinutes"))}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
                }
              />
            </FormField>
          </div>

          <Separator />

          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Optional
          </p>

          <FormField label="Location" htmlFor="session-location" description="Optional">
            <Input
              id="session-location"
              placeholder="e.g. Yela"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />
          </FormField>

          <FormField label="Notes" htmlFor="session-notes" description="Optional">
            <Textarea
              id="session-notes"
              placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </FormField>

          {previewNetProfit !== null && (
            <p className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm">
              Net profit preview:{" "}
              <span className="font-medium tabular-nums">{formatSignedAuec(previewNetProfit)}</span>
            </p>
          )}

          {!isEdit && (
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/80 bg-muted/20 px-3 py-3">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-input"
                checked={createTransaction}
                onChange={(e) => setCreateTransaction(e.target.checked)}
              />
              <span className="text-sm leading-snug">
                Create transaction from this session
                <span className="mt-1 block text-muted-foreground">
                  Adds an income or expense transaction based on net profit.
                </span>
              </span>
            </label>
          )}

          {globalError && (
            <p className="text-sm text-destructive" role="alert">
              {globalError}
            </p>
          )}
          </div>
        </FormDialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

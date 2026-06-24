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
import { FormDialogBody } from "@/components/shared/FormDialogBody";
import { FormField } from "@/components/shared/FormField";
import { mapGoalFieldError } from "@/lib/mapValidationError";
import { validateGoalForm } from "@/lib/validateGoal";
import type { Goal, GoalInput } from "@/types/goal";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSubmit: (input: GoalInput) => Promise<void>;
}

const emptyForm = {
  title: "",
  targetAmount: "",
};

export function GoalFormDialog({ open, onOpenChange, goal, onSubmit }: GoalFormDialogProps) {
  const isEdit = Boolean(goal);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (goal) {
      setForm({
        title: goal.title,
        targetAmount: String(goal.targetAmount),
      });
    } else {
      setForm(emptyForm);
    }
    setFieldErrors({});
    setGlobalError(null);
  }, [open, goal]);

  function fieldError(id: string): string | undefined {
    return fieldErrors[id];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateGoalForm(form);
    if (!result.valid) {
      const msg = result.error ?? "Invalid input";
      const field = mapGoalFieldError(msg);
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
    setGlobalError(null);
    try {
      await onSubmit(result.value!);
      onOpenChange(false);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit goal" : "Set Goal"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update your savings target or ship purchase goal."
                : "Set a target amount for a ship, gear, or savings milestone."}
            </DialogDescription>
          </DialogHeader>

          <FormDialogBody>
            <div className="grid gap-5 py-2">
              <FormField label="Title" htmlFor="goal-title" error={fieldError("title")}>
                <Input
                  id="goal-title"
                  value={form.title}
                  aria-invalid={Boolean(fieldError("title"))}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Buy Drake Vulture"
                  autoFocus
                />
              </FormField>

              <FormField
                label="Target amount (aUEC)"
                htmlFor="goal-target"
                description="Whole aUEC, must be greater than 0"
                error={fieldError("targetAmount")}
              >
                <Input
                  id="goal-target"
                  type="number"
                  min={1}
                  step={1}
                  value={form.targetAmount}
                  aria-invalid={Boolean(fieldError("targetAmount"))}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  placeholder="8000000"
                />
              </FormField>

              {globalError && (
                <p className="text-sm text-destructive" role="alert">
                  {globalError}
                </p>
              )}
            </div>
          </FormDialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Set Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { toDateInputValue } from "@/lib/formatTransactionDate";
import { mapTransactionFieldError } from "@/lib/mapValidationError";
import { validateTransactionForm } from "@/lib/validateTransaction";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionInput, TransactionType } from "@/types/transaction";
import {
  getCategoriesForType,
  getDefaultCategoryForType,
} from "@/types/transaction-categories";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  defaultType?: TransactionType;
  defaults?: TransactionFormDefaults;
  onSubmit: (input: TransactionInput) => Promise<void>;
}

const emptyForm = {
  type: "" as TransactionType | "",
  category: "",
  amount: "",
  title: "",
  description: "",
  activityType: "",
  shipUsed: "",
  location: "",
  date: toDateInputValue(new Date().toISOString()),
};

export type TransactionFormDefaults = Partial<typeof emptyForm>;

function dialogTitle(isEdit: boolean, type: TransactionType | ""): string {
  if (isEdit) return "Edit transaction";
  if (type === "income") return "Add Income";
  if (type === "expense") return "Add Expense";
  return "Add transaction";
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultType,
  defaults,
  onSubmit,
}: TransactionFormDialogProps) {
  const isEdit = Boolean(transaction);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (transaction) {
      setForm({
        type: transaction.type,
        category: transaction.category,
        amount: String(transaction.amount),
        title: transaction.title,
        description: transaction.description,
        activityType: transaction.activityType,
        shipUsed: transaction.shipUsed,
        location: transaction.location,
        date: toDateInputValue(transaction.createdAt),
      });
    } else {
      const type = defaultType ?? "income";
      setForm({
        ...emptyForm,
        type,
        category: getDefaultCategoryForType(type),
        date: toDateInputValue(new Date().toISOString()),
        ...defaults,
      });
    }
    setFieldErrors({});
    setGlobalError(null);
  }, [open, transaction, defaultType, defaults]);

  function handleTypeChange(type: TransactionType) {
    const categories = getCategoriesForType(type);
    const category = categories.includes(form.category)
      ? form.category
      : getDefaultCategoryForType(type);
    setForm((prev) => ({ ...prev, type, category }));
    setFieldErrors({});
    setGlobalError(null);
  }

  function fieldError(id: string): string | undefined {
    return fieldErrors[id];
  }

  async function handleSubmit() {
    const validation = validateTransactionForm(form);
    if (!validation.valid || !validation.value) {
      const msg = validation.error ?? "Invalid form.";
      const field = mapTransactionFieldError(msg);
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
      await onSubmit(validation.value);
      onOpenChange(false);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save transaction.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const categories = form.type ? getCategoriesForType(form.type) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle(isEdit, form.type)}</DialogTitle>
          <DialogDescription>
            Record income, expenses, or balance adjustments for your finances.
          </DialogDescription>
        </DialogHeader>

        <FormDialogBody>
          <div className="grid gap-5 py-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Details
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Type" error={fieldError("type")}>
              <Select
                value={form.type || undefined}
                onValueChange={(v) => handleTypeChange(v as TransactionType)}
              >
                <SelectTrigger
                  className={cn("w-full", fieldError("type") && "border-destructive")}
                  aria-invalid={Boolean(fieldError("type"))}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Category" error={fieldError("category")}>
              <Select
                value={form.category || undefined}
                onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}
                disabled={!form.type}
              >
                <SelectTrigger
                  className={cn("w-full", fieldError("category") && "border-destructive")}
                  aria-invalid={Boolean(fieldError("category"))}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Amount (aUEC)"
              htmlFor="tx-amount"
              description="Whole aUEC, no decimals"
              error={fieldError("amount")}
            >
              <Input
                id="tx-amount"
                inputMode="decimal"
                placeholder="e.g. 50000"
                value={form.amount}
                aria-invalid={Boolean(fieldError("amount"))}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </FormField>

            <FormField label="Date" htmlFor="tx-date" error={fieldError("date")}>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                aria-invalid={Boolean(fieldError("date"))}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Title" htmlFor="tx-title" error={fieldError("title")}>
            <Input
              id="tx-title"
              placeholder="e.g. Stanton haul run"
              value={form.title}
              aria-invalid={Boolean(fieldError("title"))}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </FormField>

          <FormField label="Description" htmlFor="tx-description" description="Optional">
            <Textarea
              id="tx-description"
              placeholder="Optional notes…"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </FormField>

          <Separator />

          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Optional
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Activity type" htmlFor="tx-activity" description="Optional">
              <Input
                id="tx-activity"
                placeholder="e.g. Hauling"
                value={form.activityType}
                onChange={(e) => setForm((prev) => ({ ...prev, activityType: e.target.value }))}
              />
            </FormField>

            <FormField label="Ship used" htmlFor="tx-ship" description="Optional">
              <Input
                id="tx-ship"
                placeholder="e.g. Caterpillar"
                value={form.shipUsed}
                onChange={(e) => setForm((prev) => ({ ...prev, shipUsed: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Location" htmlFor="tx-location" description="Optional">
            <Input
              id="tx-location"
              placeholder="e.g. Area18"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : form.type === "income"
                  ? "Add Income"
                  : form.type === "expense"
                    ? "Add Expense"
                    : "Add transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import type { TransactionInput, TransactionType } from "@/types/transaction";
import { getCategoriesForType } from "@/types/transaction-categories";

export interface TransactionValidationResult {
  valid: boolean;
  error?: string;
  value?: TransactionInput;
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function validateTransactionForm(
  form: {
    type: TransactionType | "";
    category: string;
    amount: string;
    title: string;
    description: string;
    activityType: string;
    shipUsed: string;
    location: string;
    date: string;
  },
): TransactionValidationResult {
  if (!form.type) {
    return { valid: false, error: "Transaction type is required." };
  }

  if (!form.category.trim()) {
    return { valid: false, error: "Category is required." };
  }

  const categories = getCategoriesForType(form.type);
  if (!categories.includes(form.category)) {
    return { valid: false, error: "Please select a valid category." };
  }

  if (!form.title.trim()) {
    return { valid: false, error: "Title is required." };
  }

  const amount = parseAmount(form.amount);
  if (amount === null) {
    return { valid: false, error: "Amount is required." };
  }

  if (form.type === "income" || form.type === "expense") {
    if (amount <= 0) {
      return { valid: false, error: "Amount must be greater than 0." };
    }
  } else if (amount === 0) {
    return { valid: false, error: "Adjustment amount cannot be zero." };
  }

  if (!form.date.trim()) {
    return { valid: false, error: "Date is required." };
  }

  const dateValue = new Date(`${form.date}T12:00:00`);
  if (Number.isNaN(dateValue.getTime())) {
    return { valid: false, error: "Please enter a valid date." };
  }

  return {
    valid: true,
    value: {
      type: form.type,
      category: form.category,
      amount,
      title: form.title.trim(),
      description: form.description.trim(),
      activityType: form.activityType.trim(),
      shipUsed: form.shipUsed.trim(),
      location: form.location.trim(),
      date: dateValue.toISOString(),
    },
  };
}

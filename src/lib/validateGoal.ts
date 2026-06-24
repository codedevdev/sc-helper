import type { GoalInput } from "@/types/goal";

export interface GoalValidationResult {
  valid: boolean;
  error?: string;
  value?: GoalInput;
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function validateGoalForm(form: { title: string; targetAmount: string }): GoalValidationResult {
  if (!form.title.trim()) {
    return { valid: false, error: "Title is required." };
  }

  const targetAmount = parseAmount(form.targetAmount);
  if (targetAmount === null) {
    return { valid: false, error: "Target amount is required." };
  }

  if (targetAmount <= 0) {
    return { valid: false, error: "Target amount must be greater than 0." };
  }

  return {
    valid: true,
    value: {
      title: form.title.trim(),
      targetAmount,
    },
  };
}

import { ACTIVITY_TYPES } from "@/types/activity-types";
import type { ActivityType } from "@/types/activity-types";
import type { FarmingSessionInput } from "@/types/farming-session";

export interface FarmingSessionValidationResult {
  valid: boolean;
  error?: string;
  value?: FarmingSessionInput;
}

export interface FarmingSessionFormState {
  title: string;
  activityType: ActivityType | "";
  shipUsed: string;
  startBalance: string;
  endBalance: string;
  expenses: string;
  durationMinutes: string;
  location: string;
  notes: string;
}

function parseRequiredNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

function parseOptionalNonNegativeNumber(raw: string, defaultValue: number): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return defaultValue;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function validateFarmingSessionForm(
  form: FarmingSessionFormState,
): FarmingSessionValidationResult {
  if (!form.title.trim()) {
    return { valid: false, error: "Title is required." };
  }

  if (!form.activityType || !ACTIVITY_TYPES.includes(form.activityType)) {
    return { valid: false, error: "Please select a valid activity type." };
  }

  const startBalance = parseRequiredNumber(form.startBalance);
  if (startBalance === null) {
    return { valid: false, error: "Start balance is required." };
  }

  const endBalance = parseRequiredNumber(form.endBalance);
  if (endBalance === null) {
    return { valid: false, error: "End balance is required." };
  }

  const expenses = parseOptionalNonNegativeNumber(form.expenses, 0);
  if (expenses === null) {
    return { valid: false, error: "Expenses must be a valid number." };
  }
  if (expenses < 0) {
    return { valid: false, error: "Expenses cannot be negative." };
  }

  const durationMinutes = parseOptionalNonNegativeNumber(form.durationMinutes, 0);
  if (durationMinutes === null) {
    return { valid: false, error: "Duration must be a valid number." };
  }
  if (durationMinutes < 0) {
    return { valid: false, error: "Duration cannot be negative." };
  }

  return {
    valid: true,
    value: {
      title: form.title.trim(),
      activityType: form.activityType,
      shipUsed: form.shipUsed.trim(),
      startBalance,
      endBalance,
      expenses,
      durationMinutes,
      location: form.location.trim(),
      notes: form.notes.trim(),
    },
  };
}

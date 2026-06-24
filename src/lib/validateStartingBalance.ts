export interface StartingBalanceValidation {
  valid: boolean;
  value?: number;
  error?: string;
}

export function validateStartingBalance(input: string): StartingBalanceValidation {
  const trimmed = input.trim();

  if (trimmed === "") {
    return { valid: false, error: "Starting balance is required." };
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value)) {
    return { valid: false, error: "Starting balance must be a number." };
  }

  if (value < 0) {
    return { valid: false, error: "Starting balance cannot be negative." };
  }

  return { valid: true, value };
}

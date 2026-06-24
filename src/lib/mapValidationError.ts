/** Map a validation error message to a form field id for inline display. */

export function mapTransactionFieldError(error: string): string | undefined {
  if (error.includes("type")) return "type";
  if (error.includes("ategory")) return "category";
  if (error.includes("Title")) return "title";
  if (error.includes("Amount") || error.includes("amount")) return "amount";
  if (error.includes("date") || error.includes("Date")) return "date";
  return undefined;
}

export function mapFarmingSessionFieldError(error: string): string | undefined {
  if (error.includes("Title")) return "title";
  if (error.includes("activity")) return "activityType";
  if (error.includes("Start balance")) return "startBalance";
  if (error.includes("End balance")) return "endBalance";
  if (error.includes("Expenses")) return "expenses";
  if (error.includes("Duration")) return "durationMinutes";
  return undefined;
}

export function mapGoalFieldError(error: string): string | undefined {
  if (error.includes("Title")) return "title";
  if (error.includes("Target") || error.includes("target")) return "targetAmount";
  return undefined;
}

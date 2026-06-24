/**
 * Current balance is derived — never stored as source of truth.
 * Adjustments use signed amounts in totalAdjustments (positive = increase).
 */
export function calculateCurrentBalance(input: {
  startingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalAdjustments: number;
}): number {
  return (
    input.startingBalance +
    input.totalIncome -
    input.totalExpenses +
    input.totalAdjustments
  );
}

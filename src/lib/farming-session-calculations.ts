export function computeNetProfit(
  startBalance: number,
  endBalance: number,
  expenses: number,
): number {
  return endBalance - startBalance - expenses;
}

export function computeProfitPerHour(
  netProfit: number,
  durationMinutes: number,
): number | null {
  if (durationMinutes <= 0) return null;
  return (netProfit / durationMinutes) * 60;
}

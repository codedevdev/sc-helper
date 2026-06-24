/**
 * Formats a numeric amount as Star Citizen aUEC (e.g. "2,153,041 aUEC").
 */
export function formatAuec(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));

  return `${formatted} aUEC`;
}

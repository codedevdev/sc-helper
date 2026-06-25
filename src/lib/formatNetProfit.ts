export function formatSignedAuec(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(Math.abs(amount)));

  if (amount > 0) return `+${formatted} aUEC`;
  if (amount < 0) return `-${formatted} aUEC`;
  return `${formatted} aUEC`;
}

export function formatTradeLegCashFlow(action: "buy" | "sell", amount: number): string {
  const signed = action === "buy" ? -Math.abs(amount) : Math.abs(amount);
  return formatSignedAuec(signed);
}

export function netProfitClassName(netProfit: number): string {
  if (netProfit > 0) return "text-emerald-400 font-medium";
  if (netProfit < 0) return "text-rose-400 font-medium";
  return "text-muted-foreground font-medium";
}

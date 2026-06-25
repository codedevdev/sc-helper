import { formatAuec } from "@/lib/formatAuec";
import { formatTradeLegCashFlow } from "@/lib/formatNetProfit";
import type { TradeLoop } from "@/types/trading-route";

function hopCount(loop: TradeLoop): number {
  return loop.legs.filter((leg) => leg.action === "buy").length;
}

export function buildLoopChecklistText(loop: TradeLoop): string {
  const hops = hopCount(loop);
  const startTerminal = loop.legs[0]?.terminal.terminal ?? "Unknown";
  const lines: string[] = [
    `Loop route (${hops} legs) — +${formatAuec(loop.totalProfit)} in ~${loop.totalTime} min`,
    `Start: ${startTerminal}`,
    "",
  ];

  for (let i = 0; i < loop.legs.length; i++) {
    const leg = loop.legs[i];
    const action = leg.action.toUpperCase();
    const cashFlow = formatTradeLegCashFlow(leg.action, leg.costOrRevenue);
    lines.push(
      `${leg.step}. ${action} ${leg.scuUsed} SCU ${leg.commodity} @ ${leg.terminal.terminal} (${cashFlow})`,
    );
    const nextLeg = loop.legs[i + 1];
    if (nextLeg && nextLeg.travelFromPrev.total > 0) {
      lines.push(`   QT ${nextLeg.travelFromPrev.total} min → ${nextLeg.terminal.terminal}`);
    }
  }

  lines.push("");
  lines.push(
    `Totals: +${formatAuec(loop.totalProfit)} | ${loop.totalTime} min | ${formatAuec(loop.profitPerMin)}/min`,
  );

  return lines.join("\n");
}

export function loopHopCount(loop: TradeLoop): number {
  return hopCount(loop);
}

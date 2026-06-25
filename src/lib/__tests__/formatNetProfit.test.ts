import { describe, expect, it } from "vitest";
import { formatSignedAuec, formatTradeLegCashFlow } from "@/lib/formatNetProfit";

describe("formatTradeLegCashFlow", () => {
  it("formats buy as negative cash outflow", () => {
    expect(formatTradeLegCashFlow("buy", 465_102)).toBe("-465,102 aUEC");
  });

  it("formats sell as positive cash inflow", () => {
    expect(formatTradeLegCashFlow("sell", 673_200)).toBe("+673,200 aUEC");
  });

  it("does not duplicate aUEC suffix", () => {
    const buy = formatTradeLegCashFlow("buy", 465_102);
    const sell = formatTradeLegCashFlow("sell", 673_200);
    expect(buy).not.toContain("aUEC aUEC");
    expect(sell).not.toContain("aUEC aUEC");
  });
});

describe("formatSignedAuec", () => {
  it("includes sign and single aUEC suffix", () => {
    expect(formatSignedAuec(-100)).toBe("-100 aUEC");
    expect(formatSignedAuec(100)).toBe("+100 aUEC");
  });
});

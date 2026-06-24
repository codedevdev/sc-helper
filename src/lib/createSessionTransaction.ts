import type { ActivityType } from "@/types/activity-types";
import type { FarmingSession } from "@/types/farming-session";
import type { TransactionInput } from "@/types/transaction";
import {
  INCOME_CATEGORIES,
  type IncomeCategory,
} from "@/types/transaction-categories";

function mapActivityToIncomeCategory(activityType: ActivityType): string {
  if (INCOME_CATEGORIES.includes(activityType as IncomeCategory)) {
    return activityType;
  }
  return "Other Income";
}

export function createSessionTransaction(
  session: FarmingSession,
): TransactionInput | null {
  if (session.netProfit === 0) return null;

  const now = new Date().toISOString();

  if (session.netProfit > 0) {
    return {
      type: "income",
      category: mapActivityToIncomeCategory(session.activityType),
      amount: session.netProfit,
      title: `Farming Session: ${session.title}`,
      description: "",
      activityType: session.activityType,
      shipUsed: session.shipUsed,
      location: session.location,
      date: now,
    };
  }

  return {
    type: "expense",
    category: "Other Expense",
    amount: Math.abs(session.netProfit),
    title: `Farming Session Loss: ${session.title}`,
    description: "",
    activityType: session.activityType,
    shipUsed: session.shipUsed,
    location: session.location,
    date: now,
  };
}

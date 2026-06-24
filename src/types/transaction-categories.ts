import type { TransactionType } from "./transaction";

export const INCOME_CATEGORIES = [
  "Hauling / Cargo",
  "Salvage",
  "Mining",
  "Bounty Hunting",
  "Mercenary",
  "Contracts",
  "Trading",
  "Loot Selling",
  "Other Income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Ship Purchase",
  "Ship Rental",
  "Armor",
  "Weapons",
  "Ammo",
  "Medical",
  "Fuel",
  "Repairs",
  "Cargo Purchase",
  "Equipment",
  "Other Expense",
] as const;

export const ADJUSTMENT_CATEGORIES = [
  "Manual Correction",
  "Wipe Correction",
  "Bonus",
  "Other Adjustment",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type AdjustmentCategory = (typeof ADJUSTMENT_CATEGORIES)[number];

export function getCategoriesForType(type: TransactionType): readonly string[] {
  switch (type) {
    case "income":
      return INCOME_CATEGORIES;
    case "expense":
      return EXPENSE_CATEGORIES;
    case "adjustment":
      return ADJUSTMENT_CATEGORIES;
  }
}

export function getDefaultCategoryForType(type: TransactionType): string {
  switch (type) {
    case "income":
      return "Other Income";
    case "expense":
      return "Other Expense";
    case "adjustment":
      return "Other Adjustment";
  }
}

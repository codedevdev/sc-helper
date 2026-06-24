export const ACTIVITY_TYPES = [
  "Hauling / Cargo",
  "Salvage",
  "Mining",
  "Bounty Hunting",
  "Mercenary",
  "Contracts",
  "Trading",
  "Loot Selling",
  "Mixed",
  "Other",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const DEFAULT_ACTIVITY_TYPE: ActivityType = "Other";

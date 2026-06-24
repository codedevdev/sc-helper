import type { ActivityType } from "./activity-types";

export interface FarmingSession {
  id: string;
  title: string;
  activityType: ActivityType;
  shipUsed: string;
  startBalance: number;
  endBalance: number;
  expenses: number;
  netProfit: number;
  durationMinutes: number;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface FarmingSessionInput {
  title: string;
  activityType: ActivityType;
  shipUsed: string;
  startBalance: number;
  endBalance: number;
  expenses: number;
  durationMinutes: number;
  location: string;
  notes: string;
}

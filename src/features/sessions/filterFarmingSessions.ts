import type { FarmingSession } from "@/types/farming-session";
import type { ActivityType } from "@/types/activity-types";

export interface FarmingSessionFilters {
  search: string;
  activityType: ActivityType | "all";
}

export function filterFarmingSessions(
  sessions: FarmingSession[],
  filters: FarmingSessionFilters,
): FarmingSession[] {
  const search = filters.search.trim().toLowerCase();

  return sessions
    .filter((s) => {
      if (filters.activityType !== "all" && s.activityType !== filters.activityType) {
        return false;
      }
      if (!search) return true;
      const haystack = `${s.title} ${s.notes} ${s.shipUsed} ${s.location}`.toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

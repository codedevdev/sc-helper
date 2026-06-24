import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_TYPES } from "@/types/activity-types";
import type { ActivityType } from "@/types/activity-types";
import type { FarmingSessionFilters as Filters } from "./filterFarmingSessions";

interface FarmingSessionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FarmingSessionFiltersBar({ filters, onChange }: FarmingSessionFiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="session-search">Search</Label>
        <Input
          id="session-search"
          placeholder="Search title, notes, ship, or location…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Activity type</Label>
        <Select
          value={filters.activityType}
          onValueChange={(v) =>
            onChange({ ...filters, activityType: v as ActivityType | "all" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All activities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activities</SelectItem>
            {ACTIVITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface AnalyticsEmptyStateProps {
  message: string;
}

export function AnalyticsEmptyState({ message }: AnalyticsEmptyStateProps) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No data yet"
      description={message}
      compact
      className="h-[280px]"
    />
  );
}

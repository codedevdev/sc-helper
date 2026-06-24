import { Skeleton } from "@/components/ui/skeleton";

export function PageTableSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-card/70 p-6 backdrop-blur-md">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

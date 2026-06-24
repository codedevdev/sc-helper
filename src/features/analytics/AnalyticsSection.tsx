import type { ReactNode } from "react";

interface AnalyticsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AnalyticsSection({ title, description, children }: AnalyticsSectionProps) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

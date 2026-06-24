import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  className?: string;
}

export function SectionHeading({ title, className }: SectionHeadingProps) {
  return (
    <h2
      className={cn(
        "text-xs font-medium tracking-widest text-muted-foreground uppercase",
        className,
      )}
    >
      {title}
    </h2>
  );
}

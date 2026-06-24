import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormDialogBodyProps {
  children: ReactNode;
  className?: string;
}

export function FormDialogBody({ children, className }: FormDialogBodyProps) {
  return (
    <div
      className={cn(
        "relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      {children}
    </div>
  );
}

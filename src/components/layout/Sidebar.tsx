import { NavLink } from "react-router-dom";
import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  Route,
  Settings,
  Target,
  Timer,
  Wallet,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UexStatusIndicator } from "@/components/layout/UexStatusIndicator";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/sessions", label: "Sessions", icon: Timer },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/trading-routes", label: "Trading Routes", icon: Route },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 shadow-[0_0_16px_-4px_oklch(0.72_0.14_195_/_0.4)]">
          <Wallet className="size-4 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
            SC Helper
          </p>
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Star Citizen
          </p>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {navItems.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest ? rest.end : false}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-opacity",
                      isActive ? "text-primary opacity-100" : "opacity-60 group-hover:opacity-90",
                    )}
                    aria-hidden
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      <div className="space-y-2 border-t border-sidebar-border px-4 py-3">
        <p className="text-[11px] text-muted-foreground/70">Local · SQLite</p>
        <UexStatusIndicator />
      </div>
    </aside>
  );
}

import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { pathname } = useLocation();
  const isAnalytics = pathname === "/analytics";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div
          className={cn(
            "mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
            isAnalytics ? "max-w-7xl" : "max-w-6xl",
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { ArrowDownLeft, ArrowUpRight, Route, Target, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DashboardQuickActionsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onAddSession: () => void;
  onSetGoal: () => void;
}

export function DashboardQuickActions({
  onAddIncome,
  onAddExpense,
  onAddSession,
  onSetGoal,
}: DashboardQuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={onAddIncome}>
        <ArrowUpRight className="size-4" />
        Add Income
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={onAddExpense}>
        <ArrowDownLeft className="size-4" />
        Add Expense
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onAddSession}>
        <Timer className="size-4" />
        Add Session
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onSetGoal}>
        <Target className="size-4" />
        Set Goal
      </Button>
      <Button type="button" size="sm" variant="outline" asChild>
        <Link to="/trading-routes">
          <Route className="size-4" />
          Find trade route
        </Link>
      </Button>
    </div>
  );
}

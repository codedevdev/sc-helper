import { useState } from "react";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Rocket,
  Scale,
  Sprout,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { useFarmingSessions } from "@/hooks/useFarmingSessions";
import { useGoals } from "@/hooks/useGoals";
import { useSettings } from "@/hooks/useSettings";
import { useTransactions } from "@/hooks/useTransactions";
import { createSessionTransaction } from "@/lib/createSessionTransaction";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { getFarmingDashboardStats } from "@/lib/farming-dashboard-stats";
import { getActiveGoal } from "@/lib/goal-progress";
import { formatAuec } from "@/lib/formatAuec";
import type { TransactionType } from "@/types/transaction";
import { GoalFormDialog } from "@/features/goals/GoalFormDialog";
import { FarmingSessionFormDialog } from "@/features/sessions/FarmingSessionFormDialog";
import { TransactionFormDialog } from "@/features/transactions/TransactionFormDialog";
import { ActiveGoalCard } from "./ActiveGoalCard";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { RecentSessionsPanel } from "./RecentSessionsPanel";
import { RecentTransactionsPanel } from "./RecentTransactionsPanel";

export function DashboardPage() {
  const { settings, status: settingsStatus, error: settingsError } = useSettings();
  const {
    transactions,
    totals,
    status: txStatus,
    error: txError,
    create: createTransaction,
  } = useTransactions();
  const {
    sessions,
    status: sessionsStatus,
    error: sessionsError,
    create: createSession,
  } = useFarmingSessions();
  const { goals, status: goalsStatus, error: goalsError, create: createGoal } = useGoals();

  const [txFormOpen, setTxFormOpen] = useState(false);
  const [txDefaultType, setTxDefaultType] = useState<TransactionType | undefined>();
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [goalFormOpen, setGoalFormOpen] = useState(false);

  const isLoading =
    settingsStatus === "loading" ||
    settingsStatus === "idle" ||
    txStatus === "loading" ||
    txStatus === "idle" ||
    sessionsStatus === "loading" ||
    sessionsStatus === "idle" ||
    goalsStatus === "loading" ||
    goalsStatus === "idle";

  const stats = settings ? getDashboardStats(settings, totals) : null;
  const farmingStats = getFarmingDashboardStats(sessions);
  const activeGoal = stats ? getActiveGoal(goals, stats.currentBalance) : null;
  const showSetupHint =
    settings && settings.startingBalance === 0 && settings.updatedAt === null;

  const loadError = settingsError ?? txError ?? sessionsError ?? goalsError;

  function openAddIncome() {
    setTxDefaultType("income");
    setTxFormOpen(true);
  }

  function openAddExpense() {
    setTxDefaultType("expense");
    setTxFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Overview of your aUEC balance and activity · ${format(new Date(), "PPP")}`}
        action={
          !isLoading && stats ? (
            <DashboardQuickActions
              onAddIncome={openAddIncome}
              onAddExpense={openAddExpense}
              onAddSession={() => setSessionFormOpen(true)}
              onSetGoal={() => setGoalFormOpen(true)}
            />
          ) : undefined
        }
      />

      {(settingsStatus === "error" ||
        txStatus === "error" ||
        sessionsStatus === "error" ||
        goalsStatus === "error") && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load dashboard data: {loadError ?? "Unknown error"}
          </CardContent>
        </Card>
      )}

      {showSetupHint && (
        <Card className="mb-6 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Set your starting balance in{" "}
            <Link to="/settings" className="font-medium text-primary hover:underline">
              Settings
            </Link>{" "}
            to begin tracking your finances.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : stats ? (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2 lg:hidden">
            <DashboardQuickActions
              onAddIncome={openAddIncome}
              onAddExpense={openAddExpense}
              onAddSession={() => setSessionFormOpen(true)}
              onSetGoal={() => setGoalFormOpen(true)}
            />
          </div>

          <section className="space-y-4">
            <SectionHeading title="Overview" />
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                title="Current Balance"
                value={formatAuec(stats.currentBalance)}
                hint="Starting balance + income − expenses + adjustments"
                icon={Wallet}
                variant="profit"
                size="hero"
              />
              <StatCard
                title="Net Profit"
                value={formatAuec(stats.netProfit)}
                hint="Income minus expenses (excludes adjustments)"
                icon={Scale}
                variant={stats.netProfit < 0 ? "expense" : "profit"}
                size="hero"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Starting Balance"
                value={formatAuec(stats.startingBalance)}
                hint="Baseline from settings"
                icon={Landmark}
              />
              <StatCard
                title="Total Income"
                value={formatAuec(stats.totalIncome)}
                hint="Sum of all income transactions"
                icon={ArrowUpRight}
                variant="income"
              />
              <StatCard
                title="Total Expenses"
                value={formatAuec(stats.totalExpenses)}
                hint="Sum of all expense transactions"
                icon={ArrowDownLeft}
                variant="expense"
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading title="Current Goal" />
            <ActiveGoalCard
              goal={activeGoal}
              currentBalance={stats.currentBalance}
              onSetGoal={() => setGoalFormOpen(true)}
            />
          </section>

          <section className="space-y-4">
            <SectionHeading title="Recent activity" />
            <div className="grid gap-4 lg:grid-cols-2">
              <RecentTransactionsPanel transactions={transactions} />
              <RecentSessionsPanel sessions={sessions} />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading title="Farming sessions" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Sessions"
                value={String(farmingStats.totalSessions)}
                hint="Recorded farming runs"
                icon={Sprout}
              />
              <StatCard
                title="Avg Profit / Session"
                value={formatAuec(farmingStats.averageProfitPerSession)}
                hint="Mean net profit across all sessions"
                icon={Target}
                variant={
                  farmingStats.averageProfitPerSession < 0 ? "expense" : "profit"
                }
              />
              <StatCard
                title="Best Activity"
                value={farmingStats.bestActivityType ?? "—"}
                hint={
                  farmingStats.bestActivityType
                    ? `${formatAuec(farmingStats.bestActivityProfit)} total net profit`
                    : "Add sessions to see top activity"
                }
                icon={TrendingUp}
                variant="profit"
              />
              <StatCard
                title="Best Ship"
                value={farmingStats.bestShip ?? "—"}
                hint={
                  farmingStats.bestShip
                    ? `${formatAuec(farmingStats.bestShipProfit)} total net profit`
                    : "Add ship names to sessions to compare"
                }
                icon={Rocket}
                variant="profit"
              />
            </div>
          </section>
        </div>
      ) : null}

      <TransactionFormDialog
        open={txFormOpen}
        onOpenChange={setTxFormOpen}
        defaultType={txDefaultType}
        onSubmit={async (input) => {
          await createTransaction(input);
        }}
      />

      <FarmingSessionFormDialog
        open={sessionFormOpen}
        onOpenChange={setSessionFormOpen}
        onSubmit={async (input, createTx) => {
          const session = await createSession(input);
          if (createTx) {
            const txInput = createSessionTransaction(session);
            if (txInput) {
              await createTransaction(txInput);
            }
          }
        }}
      />

      <GoalFormDialog
        open={goalFormOpen}
        onOpenChange={setGoalFormOpen}
        onSubmit={async (input) => {
          await createGoal(input);
        }}
      />
    </>
  );
}

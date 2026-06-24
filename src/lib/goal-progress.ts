import type { Goal } from "@/types/goal";

export interface GoalProgress {
  progressPercent: number;
  remainingAmount: number;
  effectiveCurrent: number;
}

export function getGoalProgress(goal: Goal, currentBalance: number): GoalProgress {
  const effectiveCurrent = currentBalance;
  const rawPercent = (effectiveCurrent / goal.targetAmount) * 100;
  const progressPercent = Math.max(0, Math.min(rawPercent, 100));
  const remainingAmount = Math.max(goal.targetAmount - currentBalance, 0);

  return {
    progressPercent,
    remainingAmount,
    effectiveCurrent,
  };
}

export function getActiveGoal(goals: Goal[], currentBalance: number): Goal | null {
  const incomplete = goals.filter((g) => !g.isCompleted);
  if (incomplete.length === 0) return null;

  return incomplete.reduce((best, goal) => {
    const bestProgress = getGoalProgress(best, currentBalance).progressPercent;
    const goalProgress = getGoalProgress(goal, currentBalance).progressPercent;

    if (goalProgress > bestProgress) return goal;
    if (goalProgress < bestProgress) return best;

    return new Date(goal.createdAt).getTime() < new Date(best.createdAt).getTime()
      ? goal
      : best;
  });
}

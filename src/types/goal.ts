export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmountSnapshot: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface GoalInput {
  title: string;
  targetAmount: number;
}

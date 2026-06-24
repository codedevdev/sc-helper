export type TransactionType = "income" | "expense" | "adjustment";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  title: string;
  description: string;
  activityType: string;
  shipUsed: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionInput {
  type: TransactionType;
  category: string;
  amount: number;
  title: string;
  description: string;
  activityType: string;
  shipUsed: string;
  location: string;
  date: string;
}

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionFilters as Filters } from "./filterTransactions";
import type { TransactionType } from "@/types/transaction";
import {
  ADJUSTMENT_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/types/transaction-categories";

interface TransactionFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  ...ADJUSTMENT_CATEGORIES,
];

const uniqueCategories = [...new Set(ALL_CATEGORIES)];

export function TransactionFiltersBar({ filters, onChange }: TransactionFiltersProps) {
  function setType(type: TransactionType | "all") {
    onChange({ ...filters, type, category: "all" });
  }

  const categoryOptions =
    filters.type === "all"
      ? uniqueCategories
      : filters.type === "income"
        ? [...INCOME_CATEGORIES]
        : filters.type === "expense"
          ? [...EXPENSE_CATEGORIES]
          : [...ADJUSTMENT_CATEGORIES];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="tx-search">Search</Label>
        <Input
          id="tx-search"
          placeholder="Search title or description…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={filters.type} onValueChange={(v) => setType(v as TransactionType | "all")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={filters.category}
          onValueChange={(v) => onChange({ ...filters, category: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

import { format, parseISO } from "date-fns";

export function formatTransactionDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "MMM d, yyyy");
  } catch {
    return isoDate;
  }
}

export function formatTransactionDateTime(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "MMM d, yyyy · h:mm a");
  } catch {
    return isoDate;
  }
}

/** Format ISO date for HTML date input (YYYY-MM-DD) */
export function toDateInputValue(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

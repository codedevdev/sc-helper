import { Pencil, Timer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { computeProfitPerHour } from "@/lib/farming-session-calculations";
import { formatDuration } from "@/lib/formatDuration";
import { formatSignedAuec, netProfitClassName } from "@/lib/formatNetProfit";
import { formatTransactionDate } from "@/lib/formatTransactionDate";
import { cn } from "@/lib/utils";
import type { FarmingSession } from "@/types/farming-session";

interface FarmingSessionTableProps {
  sessions: FarmingSession[];
  emptyMessage: string;
  emptyHint?: string;
  onEdit: (session: FarmingSession) => void;
  onDelete: (session: FarmingSession) => void;
}

export function FarmingSessionTable({
  sessions,
  emptyMessage,
  emptyHint,
  onEdit,
  onDelete,
}: FarmingSessionTableProps) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Timer}
        title="No sessions"
        description={emptyHint ? `${emptyMessage} ${emptyHint}` : emptyMessage}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[100px]">Date</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell">Activity</TableHead>
          <TableHead className="hidden lg:table-cell">Ship</TableHead>
          <TableHead className="text-right">Net profit</TableHead>
          <TableHead className="hidden sm:table-cell">Duration</TableHead>
          <TableHead className="text-right">Profit/hour</TableHead>
          <TableHead className="w-[88px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => {
          const profitPerHour = computeProfitPerHour(session.netProfit, session.durationMinutes);

          return (
            <TableRow key={session.id} className="group">
              <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                {formatTransactionDate(session.createdAt)}
              </TableCell>
              <TableCell className="max-w-[160px] truncate font-medium">{session.title}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary">{session.activityType}</Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {session.shipUsed || "—"}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium tabular-nums",
                  netProfitClassName(session.netProfit),
                )}
              >
                {formatSignedAuec(session.netProfit)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                {formatDuration(session.durationMinutes)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {profitPerHour !== null ? formatSignedAuec(profitPerHour) : "—"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-0.5 opacity-100 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Edit ${session.title}`}
                    onClick={() => onEdit(session)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Delete ${session.title}`}
                    onClick={() => onDelete(session)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

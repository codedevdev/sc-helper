import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, RefreshCw, Save, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FormDialogBody } from "@/components/shared/FormDialogBody";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { formatAuec } from "@/lib/formatAuec";
import { cn } from "@/lib/utils";
import type { TradeLeg, TradeLoop } from "@/types/trading-route";
import { buildLoopChecklistText, loopHopCount } from "./loop-checklist";
import { getTerminalTagLabels } from "./route-detail-helpers";

interface LoopDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loop: TradeLoop | null;
  readOnly?: boolean;
  onSave?: () => void | Promise<void>;
  saving?: boolean;
  onLogAsIncome?: () => void;
  onStartSession?: () => void;
}

function formatSignedAuec(value: number): string {
  const formatted = formatAuec(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function roiClassName(roi: number): string {
  if (roi >= 30) return "text-emerald-400";
  if (roi >= 15) return "text-amber-400/90";
  return "text-muted-foreground";
}

interface MetricTileProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function MetricTile({ label, value, valueClassName }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", valueClassName)}>{value}</p>
    </div>
  );
}

interface StepRowProps {
  leg: TradeLeg;
  nextLeg?: TradeLeg;
}

function StepRow({ leg, nextLeg }: StepRowProps) {
  const tags = getTerminalTagLabels(leg.terminal);
  const actionLabel = leg.action.toUpperCase();

  return (
    <div className="space-y-1">
      <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
        <p className="text-sm">
          <span className="font-medium">Step {leg.step}:</span>{" "}
          <span className={leg.action === "buy" ? "text-amber-400/90" : "text-emerald-400/90"}>
            {actionLabel}
          </span>{" "}
          {leg.scuUsed} SCU {leg.commodity} @ {leg.terminal.terminal}{" "}
          <span className="tabular-nums text-muted-foreground">
            ({formatSignedAuec(leg.costOrRevenue)} aUEC)
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{leg.terminal.location}</p>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {nextLeg && nextLeg.travelFromPrev.total > 0 && (
        <p className="pl-4 text-xs text-muted-foreground">
          ↳ QT {nextLeg.travelFromPrev.total} min → {nextLeg.terminal.terminal}
        </p>
      )}
    </div>
  );
}

function loopPathDescription(loop: TradeLoop): string {
  const names = loop.legs.map((leg) => leg.terminal.terminal);
  return names.join(" → ");
}

export function LoopDetailDialog({
  open,
  onOpenChange,
  loop,
  readOnly,
  onSave,
  saving,
  onLogAsIncome,
  onStartSession,
}: LoopDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!loop) return null;

  const hops = loopHopCount(loop);

  async function handleCopy() {
    const ok = await copyToClipboard(buildLoopChecklistText(loop!));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <RefreshCw className="size-5 text-muted-foreground" />
            Loop route · {hops} legs
            {readOnly && (
              <Badge variant="secondary" className="text-[10px]">
                Saved
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="truncate">{loopPathDescription(loop)}</DialogDescription>
        </DialogHeader>

        <FormDialogBody className="space-y-6 px-1">
          <section>
            <SectionHeading title="Overview" className="mb-3" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <MetricTile
                label="Total profit"
                value={`+${formatAuec(loop.totalProfit)}`}
                valueClassName="text-emerald-400"
              />
              <MetricTile label="Profit / min" value={`+${formatAuec(loop.profitPerMin)}/min`} />
              <MetricTile
                label="ROI"
                value={`${loop.roiPercent.toFixed(1)}%`}
                valueClassName={roiClassName(loop.roiPercent)}
              />
              <MetricTile label="Total time" value={`≈${loop.totalTime} min`} />
              <MetricTile label="Legs" value={String(hops)} />
              <MetricTile label="Final budget" value={formatAuec(loop.finalBudget)} />
            </div>
          </section>

          <Separator />

          <section>
            <SectionHeading title="Checklist" className="mb-3" />
            <div className="space-y-2">
              {loop.legs.map((leg, index) => (
                <StepRow
                  key={`${leg.step}-${leg.action}-${leg.commodityId}-${leg.terminal.terminalId}`}
                  leg={leg}
                  nextLeg={loop.legs[index + 1]}
                />
              ))}
            </div>
          </section>
        </FormDialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <div className="flex w-full flex-wrap gap-2 sm:mr-auto">
            {onLogAsIncome && (
              <Button type="button" size="sm" onClick={onLogAsIncome}>
                <ArrowUpRight className="size-4" />
                Log as income
              </Button>
            )}
            {onStartSession && (
              <Button type="button" size="sm" variant="outline" onClick={onStartSession}>
                <Timer className="size-4" />
                Start session
              </Button>
            )}
          </div>
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!readOnly && onSave && (
              <Button type="button" disabled={saving} onClick={() => void onSave()}>
                <Save className="size-4" />
                Save loop
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy checklist
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

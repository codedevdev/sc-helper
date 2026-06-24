import { useMemo, useState } from "react";
import { Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUexData } from "@/hooks/useUexData";
import { formatAuec } from "@/lib/formatAuec";
import type { TradingRouteMode } from "@/types/trading-route";
import { TradingRoutesSkeleton } from "./TradingRoutesSkeleton";

type LookupMode = "commodity" | "terminal";

interface MarketLookupViewProps {
  onPlanRoute?: (commodity: string) => void;
  onModeChange?: (mode: TradingRouteMode) => void;
}

export function MarketLookupView({ onPlanRoute, onModeChange }: MarketLookupViewProps) {
  const { data: marketData, status } = useUexData();
  const [lookupMode, setLookupMode] = useState<LookupMode>("commodity");
  const [commodityQuery, setCommodityQuery] = useState("");
  const [selectedCommodityId, setSelectedCommodityId] = useState("");
  const [selectedTerminalId, setSelectedTerminalId] = useState("");

  const commodities = useMemo(
    () =>
      (marketData?.commodities ?? [])
        .map((c) => ({ value: String(c.id), label: c.name, keywords: c.code }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [marketData?.commodities],
  );

  const terminals = useMemo(
    () =>
      (marketData?.terminals ?? [])
        .map((t) => ({
          value: String(t.id),
          label: t.nickname || t.name,
          keywords: [t.planet_name, t.star_system_name].filter(Boolean).join(" "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [marketData?.terminals],
  );

  const commodityRows = useMemo(() => {
    if (!marketData || !selectedCommodityId) return [];
    const commodityId = Number(selectedCommodityId);
    const comm = marketData.commodities.find((c) => c.id === commodityId);
    if (!comm) return [];

    const termMap = new Map(marketData.terminals.map((t) => [t.id, t]));
    const rows: {
      terminal: string;
      system: string;
      buy: number;
      sell: number;
      stock: number;
      margin: number;
    }[] = [];

    for (const p of marketData.prices) {
      if (p.id_commodity !== commodityId) continue;
      const term = termMap.get(p.id_terminal);
      if (!term) continue;
      const buy = p.price_buy > 0 ? p.price_buy : 0;
      const sell = p.price_sell > 0 ? p.price_sell : 0;
      if (buy <= 0 && sell <= 0) continue;
      rows.push({
        terminal: term.nickname || term.name,
        system: term.star_system_name || "",
        buy,
        sell,
        stock: p.scu_sell_stock,
        margin: sell - buy,
      });
    }

    return rows.sort((a, b) => b.margin - a.margin);
  }, [marketData, selectedCommodityId]);

  const terminalRows = useMemo(() => {
    if (!marketData || !selectedTerminalId) return [];
    const terminalId = Number(selectedTerminalId);
    const commMap = new Map(marketData.commodities.map((c) => [c.id, c]));

    return marketData.prices
      .filter((p) => p.id_terminal === terminalId)
      .map((p) => {
        const comm = commMap.get(p.id_commodity);
        return {
          commodity: comm?.name ?? p.commodity_name ?? "Unknown",
          buy: p.price_buy,
          sell: p.price_sell,
          stock: p.scu_sell_stock,
        };
      })
      .filter((r) => r.buy > 0 || r.sell > 0)
      .sort((a, b) => (b.sell - b.buy) - (a.sell - a.buy));
  }, [marketData, selectedTerminalId]);

  const filteredCommodities = useMemo(() => {
    const q = commodityQuery.trim().toLowerCase();
    if (!q) return commodities.slice(0, 20);
    return commodities.filter((c) => `${c.label} ${c.keywords}`.toLowerCase().includes(q)).slice(0, 20);
  }, [commodities, commodityQuery]);

  const isLoading = status === "loading" || status === "idle";

  if (isLoading && !marketData) {
    return <TradingRoutesSkeleton />;
  }

  const selectedCommodityName =
    commodities.find((c) => c.value === selectedCommodityId)?.label ?? "";

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-border/60 bg-muted/20 p-1">
        <Button
          type="button"
          size="sm"
          variant={lookupMode === "commodity" ? "secondary" : "ghost"}
          onClick={() => setLookupMode("commodity")}
        >
          By commodity
        </Button>
        <Button
          type="button"
          size="sm"
          variant={lookupMode === "terminal" ? "secondary" : "ghost"}
          onClick={() => setLookupMode("terminal")}
        >
          By terminal
        </Button>
      </div>

      {lookupMode === "commodity" ? (
        <Card className="border-border/80 bg-card/70 backdrop-blur-md">
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lk-commodity-search">Quick search</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="lk-commodity-search"
                    className="pl-9"
                    placeholder="Type commodity name…"
                    value={commodityQuery}
                    onChange={(e) => setCommodityQuery(e.target.value)}
                  />
                </div>
                {commodityQuery && (
                  <div className="flex flex-wrap gap-2">
                    {filteredCommodities.map((c) => (
                      <Button
                        key={c.value}
                        type="button"
                        size="sm"
                        variant={selectedCommodityId === c.value ? "default" : "outline"}
                        onClick={() => {
                          setSelectedCommodityId(c.value);
                          setCommodityQuery("");
                        }}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <SearchableSelect
                label="Commodity"
                value={selectedCommodityId}
                options={commodities}
                placeholder="Search commodities…"
                onValueChange={setSelectedCommodityId}
              />
            </div>

            {selectedCommodityId && onPlanRoute && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onPlanRoute(selectedCommodityName);
                  onModeChange?.("single");
                }}
              >
                Plan route for {selectedCommodityName}
              </Button>
            )}

            {commodityRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Terminal</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead className="text-right">Buy</TableHead>
                    <TableHead className="text-right">Sell</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commodityRows.map((row) => (
                    <TableRow key={`${row.terminal}-${row.system}`}>
                      <TableCell>{row.terminal}</TableCell>
                      <TableCell className="text-muted-foreground">{row.system}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.buy > 0 ? formatAuec(row.buy) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.sell > 0 ? formatAuec(row.sell) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-400">
                        {row.margin > 0 ? `+${formatAuec(row.margin)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.stock || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              selectedCommodityId && (
                <p className="text-sm text-muted-foreground">No price data for this commodity.</p>
              )
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 bg-card/70 backdrop-blur-md">
          <CardContent className="space-y-4 pt-6">
            <SearchableSelect
              label="Terminal"
              value={selectedTerminalId}
              options={terminals}
              placeholder="Search terminals…"
              onValueChange={setSelectedTerminalId}
            />

            {terminalRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Buy</TableHead>
                    <TableHead className="text-right">Sell</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terminalRows.map((row) => (
                    <TableRow key={row.commodity}>
                      <TableCell>{row.commodity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.buy > 0 ? formatAuec(row.buy) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.sell > 0 ? formatAuec(row.sell) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.stock || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              selectedTerminalId && (
                <p className="text-sm text-muted-foreground">No commodities at this terminal.</p>
              )
            )}
          </CardContent>
        </Card>
      )}

      {!selectedCommodityId && !selectedTerminalId && lookupMode === "commodity" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="size-4" />
          Search a commodity or terminal to browse live UEX prices.
        </div>
      )}
    </div>
  );
}

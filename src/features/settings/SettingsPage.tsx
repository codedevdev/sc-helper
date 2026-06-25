import { useEffect, useMemo, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { UexStatusIndicator } from "@/components/layout/UexStatusIndicator";
import { ShipSelect } from "@/features/trading-routes/ShipSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { useTradingShips } from "@/hooks/useTradingShips";
import { useUexData } from "@/hooks/useUexData";
import {
  clearUexCache,
  initUexCacheFromSettings,
  persistBrowserUexTtlMinutes,
  setUexMarketTtlMs,
} from "@/lib/uex/cache";
import {
  getResolvedUexConfig,
  initUexConfigFromSettings,
  loadAndInitUexConfig,
} from "@/lib/uex/config";
import { cn } from "@/lib/utils";
import { formatAuec } from "@/lib/formatAuec";
import { validateStartingBalance } from "@/lib/validateStartingBalance";
import type { LogProfitBasis } from "@/lib/trading-routes/route-integration";
import {
  DEFAULT_PLANNER_INPUT,
  DEFAULT_TRADING_ROUTE_FILTERS,
} from "@/features/trading-routes/default-filters";
import {
  DEFAULT_UEX_API_BASE,
  DEFAULT_UEX_CACHE_TTL_MINUTES,
} from "@/types/settings";
import type { TradingRouteSortKey } from "@/types/trading-route";
import type { TradingRoutesDefaults } from "@/types/settings";

const SORT_OPTIONS: { value: TradingRouteSortKey; label: string }[] = [
  { value: "total-profit", label: "Total profit" },
  { value: "profit-per-scu", label: "Profit per SCU" },
  { value: "roi", label: "ROI" },
  { value: "profit-per-min", label: "Profit per minute" },
  { value: "time", label: "Travel time" },
  { value: "buy-price", label: "Buy price" },
];

function sourceLabel(source: string): string {
  if (source === "settings") return "app settings";
  if (source === "env") return ".env";
  return "default";
}

export function SettingsPage() {
  const {
    settings,
    status,
    error,
    saveStartingBalance,
    saveUexCacheTtl,
    saveUexConnection,
    saveTradingDefaults,
  } = useSettings();
  const { refetch: refetchUex, status: uexStatus } = useUexData();
  const { ships, status: shipsStatus } = useTradingShips();
  const shipsLoading = shipsStatus === "loading";

  const [inputValue, setInputValue] = useState("");
  const [ttlInput, setTtlInput] = useState(String(DEFAULT_UEX_CACHE_TTL_MINUTES));
  const [apiBaseInput, setApiBaseInput] = useState("");
  const [apiTokenInput, setApiTokenInput] = useState("");
  const [useRustHttp, setUseRustHttp] = useState(false);
  const [changeToken, setChangeToken] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [defaultShip, setDefaultShip] = useState("");
  const [defaultCargo, setDefaultCargo] = useState(String(DEFAULT_PLANNER_INPUT.cargoScu));
  const [defaultBudget, setDefaultBudget] = useState(String(DEFAULT_PLANNER_INPUT.budgetAuec));
  const [defaultCrew, setDefaultCrew] = useState(String(DEFAULT_PLANNER_INPUT.crew));
  const [defaultLogBasis, setDefaultLogBasis] = useState<LogProfitBasis>("gross");
  const [defaultSort, setDefaultSort] = useState<TradingRouteSortKey>(
    DEFAULT_TRADING_ROUTE_FILTERS.sort,
  );

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [ttlError, setTtlError] = useState<string | null>(null);
  const [uexConnError, setUexConnError] = useState<string | null>(null);
  const [tradingDefaultsError, setTradingDefaultsError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uexMessage, setUexMessage] = useState<string | null>(null);
  const [tradingMessage, setTradingMessage] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTtl, setIsSavingTtl] = useState(false);
  const [isSavingUexConn, setIsSavingUexConn] = useState(false);
  const [isSavingTrading, setIsSavingTrading] = useState(false);
  const [uexRefreshing, setUexRefreshing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const resolvedConfig = useMemo(() => getResolvedUexConfig(), [settings, uexMessage]);

  const hasSavedToken = Boolean(settings?.uexApiToken?.trim());

  useEffect(() => {
    if (!settings) return;
    setInputValue(String(settings.startingBalance));
    setTtlInput(String(settings.uexCacheTtlMinutes));
    setApiBaseInput(settings.uexApiBase);
    setUseRustHttp(settings.uexUseRustHttp);
    setChangeToken(false);
    setApiTokenInput("");

    const d = settings.tradingDefaults;
    setDefaultShip(d.shipName ?? "");
    setDefaultCargo(String(d.cargoScu ?? DEFAULT_PLANNER_INPUT.cargoScu));
    setDefaultBudget(String(d.budgetAuec ?? DEFAULT_PLANNER_INPUT.budgetAuec));
    setDefaultCrew(String(d.crew ?? DEFAULT_PLANNER_INPUT.crew));
    setDefaultLogBasis(d.logProfitBasis === "net" ? "net" : "gross");
    setDefaultSort(d.sort ?? DEFAULT_TRADING_ROUTE_FILTERS.sort);
  }, [settings]);

  async function handleSave() {
    setFieldError(null);
    setSaveMessage(null);

    const validation = validateStartingBalance(inputValue);
    if (!validation.valid || validation.value === undefined) {
      setFieldError(validation.error ?? "Invalid starting balance.");
      return;
    }

    setIsSaving(true);
    try {
      await saveStartingBalance(validation.value);
      setSaveMessage(`Saved starting balance: ${formatAuec(validation.value)}`);
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveUexConnection() {
    setUexConnError(null);
    setUexMessage(null);

    const tokenToSave =
      changeToken || !hasSavedToken ? apiTokenInput.trim() : (settings?.uexApiToken ?? "");

    setIsSavingUexConn(true);
    try {
      const updated = await saveUexConnection({
        uexApiBase: apiBaseInput.trim(),
        uexApiToken: tokenToSave,
        uexUseRustHttp: useRustHttp,
      });
      initUexConfigFromSettings(updated);
      setChangeToken(false);
      setApiTokenInput("");
      setUexMessage("UEX connection saved.");
      await refetchUex(true);
      setUexMessage("UEX connection saved and prices refreshed.");
    } catch (err) {
      setUexConnError(err instanceof Error ? err.message : "Failed to save UEX connection.");
    } finally {
      setIsSavingUexConn(false);
    }
  }

  async function handleSaveTtl() {
    setTtlError(null);
    setUexMessage(null);

    const minutes = Number.parseInt(ttlInput, 10);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
      setTtlError("Enter a whole number between 1 and 1440 minutes.");
      return;
    }

    setIsSavingTtl(true);
    try {
      await saveUexCacheTtl(minutes);
      setUexMarketTtlMs(minutes * 60 * 1000);
      if (!isTauri()) {
        persistBrowserUexTtlMinutes(minutes);
      }
      await initUexCacheFromSettings();
      setUexMessage(`Cache TTL set to ${minutes} minutes.`);
    } catch (err) {
      setTtlError(err instanceof Error ? err.message : "Failed to save cache TTL.");
    } finally {
      setIsSavingTtl(false);
    }
  }

  async function handleClearCache() {
    setUexMessage(null);
    setIsClearingCache(true);
    try {
      await clearUexCache();
      await loadAndInitUexConfig();
      setUexMessage("Price cache cleared. Refresh to fetch live UEX data.");
    } catch (err) {
      setUexMessage(err instanceof Error ? err.message : "Failed to clear cache.");
    } finally {
      setIsClearingCache(false);
    }
  }

  async function handleSaveTradingDefaults() {
    setTradingDefaultsError(null);
    setTradingMessage(null);

    const cargoScu = Number.parseInt(defaultCargo, 10);
    const budgetAuec = Number.parseInt(defaultBudget, 10);
    const crew = Number.parseInt(defaultCrew, 10) as 1 | 2 | 3 | 4;

    if (!Number.isFinite(cargoScu) || cargoScu < 1) {
      setTradingDefaultsError("Default cargo SCU must be at least 1.");
      return;
    }
    if (!Number.isFinite(budgetAuec) || budgetAuec < 0) {
      setTradingDefaultsError("Default budget must be 0 or greater.");
      return;
    }
    if (![1, 2, 3, 4].includes(crew)) {
      setTradingDefaultsError("Crew must be between 1 and 4.");
      return;
    }

    const tradingDefaults: TradingRoutesDefaults = {
      shipName: defaultShip || undefined,
      cargoScu,
      budgetAuec,
      crew,
      logProfitBasis: defaultLogBasis,
      sort: defaultSort,
    };

    setIsSavingTrading(true);
    try {
      await saveTradingDefaults(tradingDefaults);
      setTradingMessage("Trading Routes defaults saved.");
    } catch (err) {
      setTradingDefaultsError(
        err instanceof Error ? err.message : "Failed to save Trading Routes defaults.",
      );
    } finally {
      setIsSavingTrading(false);
    }
  }

  const isLoading = status === "loading" || status === "idle";

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Wallet, UEX Corp API, and Trading Routes defaults"
      />

      {status === "error" && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load settings: {error ?? "Unknown error"}
          </CardContent>
        </Card>
      )}

      <Card className="max-w-xl border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Starting balance</CardTitle>
          <CardDescription>
            Your wallet balance when you began tracking. Dashboard stats use this as the baseline
            until transactions are recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-24" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="starting-balance">Starting balance (aUEC)</Label>
                <Input
                  id="starting-balance"
                  inputMode="decimal"
                  placeholder="e.g. 2153041"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setFieldError(null);
                    setSaveMessage(null);
                  }}
                  aria-invalid={fieldError ? true : undefined}
                />
                {fieldError && (
                  <p className="text-sm text-destructive" role="alert">
                    {fieldError}
                  </p>
                )}
                {saveMessage && (
                  <p className="text-sm text-primary" role="status">
                    {saveMessage}
                  </p>
                )}
              </div>

              <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-xl border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle>UEX Corp API</CardTitle>
          <CardDescription>
            API key and base URL for live commodity prices. Values saved here take priority; leave
            fields empty to fall back to <code className="text-xs">.env</code> (
            <code className="text-xs">VITE_UEX_API_*</code>) or the public default endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="uex-api-base">API base URL</Label>
                <Input
                  id="uex-api-base"
                  type="url"
                  placeholder={DEFAULT_UEX_API_BASE}
                  value={apiBaseInput}
                  onChange={(e) => {
                    setApiBaseInput(e.target.value);
                    setUexConnError(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for default: {DEFAULT_UEX_API_BASE}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uex-api-token">API key</Label>
                {hasSavedToken && !changeToken ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">•••••• (saved)</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setChangeToken(true);
                        setApiTokenInput("");
                      }}
                    >
                      Change key
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="uex-api-token"
                      type={showToken ? "text" : "password"}
                      autoComplete="off"
                      placeholder="Bearer token (optional)"
                      value={apiTokenInput}
                      onChange={(e) => {
                        setApiTokenInput(e.target.value);
                        setUexConnError(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={showToken ? "Hide API key" : "Show API key"}
                      onClick={() => setShowToken((v) => !v)}
                    >
                      {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Stored locally on this device only. Never commit keys to git.
                </p>
              </div>

              {isTauri() && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border accent-primary"
                    checked={useRustHttp}
                    onChange={(e) => setUseRustHttp(e.target.checked)}
                  />
                  Use Rust HTTP proxy (helps with network / CORS on Windows)
                </label>
              )}

              <Button
                type="button"
                disabled={isSavingUexConn}
                onClick={() => void handleSaveUexConnection()}
              >
                {isSavingUexConn ? "Saving…" : "Save connection"}
              </Button>

              {uexConnError && (
                <p className="text-sm text-destructive" role="alert">
                  {uexConnError}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Active: base URL from {sourceLabel(resolvedConfig.baseUrlSource)}, token from{" "}
                {sourceLabel(resolvedConfig.tokenSource)}
                {isTauri() && (
                  <>
                    , HTTP via {sourceLabel(resolvedConfig.rustHttpSource)}
                  </>
                )}
              </p>
            </>
          )}

          <UexStatusIndicator showLastSync />

          <div className="space-y-2 border-t border-border/60 pt-4">
            <Label htmlFor="uex-cache-ttl">Cache TTL (minutes)</Label>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                id="uex-cache-ttl"
                type="number"
                min={1}
                max={1440}
                className="w-32"
                value={ttlInput}
                onChange={(e) => {
                  setTtlInput(e.target.value);
                  setTtlError(null);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isSavingTtl || isLoading}
                onClick={() => void handleSaveTtl()}
              >
                {isSavingTtl ? "Saving…" : "Save TTL"}
              </Button>
            </div>
            {ttlError && (
              <p className="text-sm text-destructive" role="alert">
                {ttlError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uexRefreshing || uexStatus === "loading"}
              onClick={async () => {
                setUexRefreshing(true);
                setUexMessage(null);
                try {
                  await refetchUex(true);
                  setUexMessage("Prices refreshed from UEX.");
                } catch (err) {
                  setUexMessage(err instanceof Error ? err.message : "Refresh failed.");
                } finally {
                  setUexRefreshing(false);
                }
              }}
            >
              <RefreshCw
                className={cn("size-4", (uexRefreshing || uexStatus === "loading") && "animate-spin")}
              />
              Refresh prices
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isClearingCache}
              onClick={() => void handleClearCache()}
            >
              <Trash2 className="size-4" />
              {isClearingCache ? "Clearing…" : "Clear price cache"}
            </Button>
          </div>

          {uexMessage && (
            <p className="text-sm text-primary" role="status">
              {uexMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-xl border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Trading Routes defaults</CardTitle>
          <CardDescription>
            Default ship, cargo, and profit basis when you open Trading Routes. Session filters on
            that page still override these per visit (saved in browser storage).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <ShipSelect
                shipName={defaultShip}
                ships={ships}
                loading={shipsLoading}
                onShipChange={(name, scu) => {
                  setDefaultShip(name);
                  if (scu > 0) setDefaultCargo(String(scu));
                }}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-cargo">Default cargo (SCU)</Label>
                  <Input
                    id="default-cargo"
                    type="number"
                    min={1}
                    value={defaultCargo}
                    onChange={(e) => setDefaultCargo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-budget">Default budget (aUEC)</Label>
                  <Input
                    id="default-budget"
                    type="number"
                    min={0}
                    value={defaultBudget}
                    onChange={(e) => setDefaultBudget(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default crew</Label>
                  <Select value={defaultCrew} onValueChange={setDefaultCrew}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Solo</SelectItem>
                      <SelectItem value="2">2 players</SelectItem>
                      <SelectItem value="3">3 players</SelectItem>
                      <SelectItem value="4">4 players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Log profit as</Label>
                  <Select
                    value={defaultLogBasis}
                    onValueChange={(v) => setDefaultLogBasis(v as LogProfitBasis)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gross">Gross profit</SelectItem>
                      <SelectItem value="net">Net profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default sort</Label>
                <Select
                  value={defaultSort}
                  onValueChange={(v) => setDefaultSort(v as TradingRouteSortKey)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                disabled={isSavingTrading}
                onClick={() => void handleSaveTradingDefaults()}
              >
                {isSavingTrading ? "Saving…" : "Save defaults"}
              </Button>

              {tradingDefaultsError && (
                <p className="text-sm text-destructive" role="alert">
                  {tradingDefaultsError}
                </p>
              )}
              {tradingMessage && (
                <p className="text-sm text-primary" role="status">
                  {tradingMessage}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Dashboard
        </Link>
        {" · "}
        <Link to="/trading-routes" className="text-primary underline-offset-4 hover:underline">
          Trading Routes
        </Link>
      </p>
    </>
  );
}

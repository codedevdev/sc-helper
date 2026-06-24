import type { TradingRouteSortKey } from "@/types/trading-route";
import type { LogProfitBasis } from "@/lib/trading-routes/route-integration";

export const DEFAULT_UEX_CACHE_TTL_MINUTES = 10;
export const DEFAULT_UEX_API_BASE = "https://api.uexcorp.space/2.0";

export interface TradingRoutesDefaults {
  shipName?: string;
  cargoScu?: number;
  budgetAuec?: number;
  crew?: 1 | 2 | 3 | 4;
  logProfitBasis?: LogProfitBasis;
  sort?: TradingRouteSortKey;
}

export const EMPTY_TRADING_ROUTES_DEFAULTS: TradingRoutesDefaults = {};

export interface Settings {
  id: number;
  startingBalance: number;
  defaultCurrency: string;
  uexCacheTtlMinutes: number;
  uexApiBase: string;
  uexApiToken: string;
  uexUseRustHttp: boolean;
  tradingDefaults: TradingRoutesDefaults;
  createdAt: string;
  updatedAt: string | null;
}

export interface UexConnectionInput {
  uexApiBase: string;
  uexApiToken: string;
  uexUseRustHttp: boolean;
}

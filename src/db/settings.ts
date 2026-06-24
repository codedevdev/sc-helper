import { getDatabase } from "./client";
import type {
  Settings,
  TradingRoutesDefaults,
  UexConnectionInput,
} from "@/types/settings";
import {
  DEFAULT_UEX_CACHE_TTL_MINUTES,
  EMPTY_TRADING_ROUTES_DEFAULTS,
} from "@/types/settings";

interface SettingsRow {
  id: number;
  starting_balance: number;
  default_currency: string;
  uex_cache_ttl_minutes?: number;
  uex_api_base?: string;
  uex_api_token?: string;
  uex_use_rust_http?: number;
  trading_defaults_json?: string;
  created_at: string;
  updated_at: string | null;
}

const DEFAULT_SETTINGS: Omit<Settings, "id"> = {
  startingBalance: 0,
  defaultCurrency: "aUEC",
  uexCacheTtlMinutes: DEFAULT_UEX_CACHE_TTL_MINUTES,
  uexApiBase: "",
  uexApiToken: "",
  uexUseRustHttp: false,
  tradingDefaults: EMPTY_TRADING_ROUTES_DEFAULTS,
  createdAt: new Date().toISOString(),
  updatedAt: null,
};

export function parseTradingDefaultsJson(raw: string | undefined | null): TradingRoutesDefaults {
  if (!raw || raw.trim() === "") return EMPTY_TRADING_ROUTES_DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as TradingRoutesDefaults;
    if (!parsed || typeof parsed !== "object") return EMPTY_TRADING_ROUTES_DEFAULTS;
    return parsed;
  } catch {
    return EMPTY_TRADING_ROUTES_DEFAULTS;
  }
}

function mapRow(row: SettingsRow): Settings {
  return {
    id: row.id,
    startingBalance: row.starting_balance,
    defaultCurrency: row.default_currency,
    uexCacheTtlMinutes: row.uex_cache_ttl_minutes ?? DEFAULT_UEX_CACHE_TTL_MINUTES,
    uexApiBase: row.uex_api_base ?? "",
    uexApiToken: row.uex_api_token ?? "",
    uexUseRustHttp: row.uex_use_rust_http === 1,
    tradingDefaults: parseTradingDefaultsJson(row.trading_defaults_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureDefaultSettings(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR IGNORE INTO settings (
      id, starting_balance, default_currency, uex_cache_ttl_minutes,
      uex_api_base, uex_api_token, uex_use_rust_http, trading_defaults_json,
      created_at, updated_at
    ) VALUES (1, ?, ?, ?, '', '', 0, '{}', ?, NULL)`,
    [
      DEFAULT_SETTINGS.startingBalance,
      DEFAULT_SETTINGS.defaultCurrency,
      DEFAULT_SETTINGS.uexCacheTtlMinutes,
      now,
    ],
  );
}

export async function getSettings(): Promise<Settings> {
  await ensureDefaultSettings();

  const db = await getDatabase();
  const rows = await db.select<SettingsRow[]>(
    `SELECT id, starting_balance, default_currency, uex_cache_ttl_minutes,
            uex_api_base, uex_api_token, uex_use_rust_http, trading_defaults_json,
            created_at, updated_at
     FROM settings
     WHERE id = 1`,
  );

  const row = rows[0];
  if (!row) {
    return { id: 1, ...DEFAULT_SETTINGS };
  }

  return mapRow(row);
}

export async function updateStartingBalance(startingBalance: number): Promise<Settings> {
  await ensureDefaultSettings();

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE settings SET starting_balance = ?, updated_at = ? WHERE id = 1`,
    [startingBalance, now],
  );

  return getSettings();
}

export async function updateUexCacheTtl(uexCacheTtlMinutes: number): Promise<Settings> {
  await ensureDefaultSettings();

  const db = await getDatabase();
  const now = new Date().toISOString();
  const clamped = Math.min(1440, Math.max(1, Math.round(uexCacheTtlMinutes)));

  await db.execute(
    `UPDATE settings SET uex_cache_ttl_minutes = ?, updated_at = ? WHERE id = 1`,
    [clamped, now],
  );

  return getSettings();
}

export async function updateUexConnection(input: UexConnectionInput): Promise<Settings> {
  await ensureDefaultSettings();

  const db = await getDatabase();
  const now = new Date().toISOString();
  const base = input.uexApiBase.trim();
  const token = input.uexApiToken.trim();

  await db.execute(
    `UPDATE settings
     SET uex_api_base = ?, uex_api_token = ?, uex_use_rust_http = ?, updated_at = ?
     WHERE id = 1`,
    [base, token, input.uexUseRustHttp ? 1 : 0, now],
  );

  return getSettings();
}

export async function updateTradingDefaults(
  tradingDefaults: TradingRoutesDefaults,
): Promise<Settings> {
  await ensureDefaultSettings();

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE settings SET trading_defaults_json = ?, updated_at = ? WHERE id = 1`,
    [JSON.stringify(tradingDefaults), now],
  );

  return getSettings();
}

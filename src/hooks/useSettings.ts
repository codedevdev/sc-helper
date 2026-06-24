import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  getSettings,
  parseTradingDefaultsJson,
  updateStartingBalance,
  updateTradingDefaults,
  updateUexCacheTtl,
  updateUexConnection,
} from "@/db/settings";
import type { Settings, TradingRoutesDefaults, UexConnectionInput } from "@/types/settings";
import {
  DEFAULT_UEX_CACHE_TTL_MINUTES,
  EMPTY_TRADING_ROUTES_DEFAULTS,
} from "@/types/settings";

const STORAGE_KEY = "sc-trader-settings";

type LoadStatus = "idle" | "loading" | "ready" | "error";

function defaultBrowserSettings(): Settings {
  return {
    id: 1,
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
}

function readBrowserSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBrowserSettings();
    const parsed = JSON.parse(raw) as Partial<Settings> & {
      tradingDefaults?: TradingRoutesDefaults;
      trading_defaults_json?: string;
    };
    const tradingDefaults =
      parsed.tradingDefaults ??
      parseTradingDefaultsJson(
        typeof parsed.trading_defaults_json === "string"
          ? parsed.trading_defaults_json
          : undefined,
      );
    return {
      ...defaultBrowserSettings(),
      ...parsed,
      uexCacheTtlMinutes:
        parsed.uexCacheTtlMinutes ?? DEFAULT_UEX_CACHE_TTL_MINUTES,
      uexApiBase: parsed.uexApiBase ?? "",
      uexApiToken: parsed.uexApiToken ?? "",
      uexUseRustHttp: parsed.uexUseRustHttp ?? false,
      tradingDefaults,
    };
  } catch {
    return defaultBrowserSettings();
  }
}

function writeBrowserSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      if (!isTauri()) {
        setSettings(readBrowserSettings());
        setStatus("ready");
        return;
      }

      const data = await getSettings();
      setSettings(data);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      const message =
        err instanceof Error
          ? err.message || "Failed to load settings"
          : typeof err === "string"
            ? err
            : "Failed to load settings";
      setError(message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStartingBalance = useCallback(
    async (startingBalance: number) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const next: Settings = {
          ...(settings ?? readBrowserSettings()),
          startingBalance,
          updatedAt: now,
        };
        writeBrowserSettings(next);
        setSettings(next);
        return next;
      }

      const updated = await updateStartingBalance(startingBalance);
      setSettings(updated);
      return updated;
    },
    [settings],
  );

  const saveUexCacheTtl = useCallback(
    async (uexCacheTtlMinutes: number) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const next: Settings = {
          ...(settings ?? readBrowserSettings()),
          uexCacheTtlMinutes: Math.min(1440, Math.max(1, Math.round(uexCacheTtlMinutes))),
          updatedAt: now,
        };
        writeBrowserSettings(next);
        setSettings(next);
        return next;
      }

      const updated = await updateUexCacheTtl(uexCacheTtlMinutes);
      setSettings(updated);
      return updated;
    },
    [settings],
  );

  const saveUexConnection = useCallback(
    async (input: UexConnectionInput) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const next: Settings = {
          ...(settings ?? readBrowserSettings()),
          uexApiBase: input.uexApiBase.trim(),
          uexApiToken: input.uexApiToken.trim(),
          uexUseRustHttp: input.uexUseRustHttp,
          updatedAt: now,
        };
        writeBrowserSettings(next);
        setSettings(next);
        return next;
      }

      const updated = await updateUexConnection(input);
      setSettings(updated);
      return updated;
    },
    [settings],
  );

  const saveTradingDefaults = useCallback(
    async (tradingDefaults: TradingRoutesDefaults) => {
      if (!isTauri()) {
        const now = new Date().toISOString();
        const next: Settings = {
          ...(settings ?? readBrowserSettings()),
          tradingDefaults,
          updatedAt: now,
        };
        writeBrowserSettings(next);
        setSettings(next);
        return next;
      }

      const updated = await updateTradingDefaults(tradingDefaults);
      setSettings(updated);
      return updated;
    },
    [settings],
  );

  return {
    settings,
    status,
    error,
    reload: load,
    saveStartingBalance,
    saveUexCacheTtl,
    saveUexConnection,
    saveTradingDefaults,
  };
}

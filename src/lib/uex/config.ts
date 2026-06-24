import { isTauri } from "@tauri-apps/api/core";
import { getSettings, parseTradingDefaultsJson } from "@/db/settings";
import type { Settings } from "@/types/settings";
import { DEFAULT_UEX_API_BASE } from "@/types/settings";

const BROWSER_SETTINGS_KEY = "sc-trader-settings";

export type UexConfigSource = "settings" | "env" | "default";

export interface ResolvedUexConfig {
  baseUrl: string;
  token: string | undefined;
  useRustHttp: boolean;
  baseUrlSource: UexConfigSource;
  tokenSource: UexConfigSource;
  rustHttpSource: UexConfigSource;
}

let runtimeSettings: Pick<
  Settings,
  "uexApiBase" | "uexApiToken" | "uexUseRustHttp"
> | null = null;

export function initUexConfigFromSettings(settings: Settings): void {
  runtimeSettings = {
    uexApiBase: settings.uexApiBase,
    uexApiToken: settings.uexApiToken,
    uexUseRustHttp: settings.uexUseRustHttp,
  };
}

function envBaseUrl(): string | undefined {
  const v = import.meta.env.VITE_UEX_API_BASE;
  return typeof v === "string" && v.length > 0 ? v.replace(/\/$/, "") : undefined;
}

function envToken(): string | undefined {
  const v = import.meta.env.VITE_UEX_API_TOKEN;
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function envUseRustHttp(): boolean {
  return import.meta.env.VITE_UEX_USE_RUST_HTTP === "1";
}

export function getResolvedUexConfig(): ResolvedUexConfig {
  const settingsBase = runtimeSettings?.uexApiBase?.trim() ?? "";
  const settingsToken = runtimeSettings?.uexApiToken?.trim() ?? "";
  const settingsRust = runtimeSettings?.uexUseRustHttp ?? false;

  const envBase = envBaseUrl();
  const envTok = envToken();
  const envRust = envUseRustHttp();

  let baseUrl = DEFAULT_UEX_API_BASE;
  let baseUrlSource: UexConfigSource = "default";
  if (settingsBase) {
    baseUrl = settingsBase.replace(/\/$/, "");
    baseUrlSource = "settings";
  } else if (envBase) {
    baseUrl = envBase;
    baseUrlSource = "env";
  }

  let token: string | undefined;
  let tokenSource: UexConfigSource = "default";
  if (settingsToken) {
    token = settingsToken;
    tokenSource = "settings";
  } else if (envTok) {
    token = envTok;
    tokenSource = "env";
  }

  let useRustHttp = false;
  let rustHttpSource: UexConfigSource = "default";
  if (settingsRust) {
    useRustHttp = true;
    rustHttpSource = "settings";
  } else if (envRust) {
    useRustHttp = true;
    rustHttpSource = "env";
  }

  return {
    baseUrl,
    token,
    useRustHttp,
    baseUrlSource,
    tokenSource,
    rustHttpSource,
  };
}

export function hasSavedUexToken(): boolean {
  return Boolean(runtimeSettings?.uexApiToken?.trim());
}

function readBrowserSettingsPartial(): Pick<
  Settings,
  "uexApiBase" | "uexApiToken" | "uexUseRustHttp"
> {
  try {
    const raw = localStorage.getItem(BROWSER_SETTINGS_KEY);
    if (!raw) return { uexApiBase: "", uexApiToken: "", uexUseRustHttp: false };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      uexApiBase: parsed.uexApiBase ?? "",
      uexApiToken: parsed.uexApiToken ?? "",
      uexUseRustHttp: parsed.uexUseRustHttp ?? false,
    };
  } catch {
    return { uexApiBase: "", uexApiToken: "", uexUseRustHttp: false };
  }
}

export async function loadAndInitUexConfig(): Promise<void> {
  if (isTauri()) {
    const settings = await getSettings();
    initUexConfigFromSettings(settings);
    return;
  }
  const partial = readBrowserSettingsPartial();
  initUexConfigFromSettings({
    id: 1,
    startingBalance: 0,
    defaultCurrency: "aUEC",
    uexCacheTtlMinutes: 10,
    ...partial,
    tradingDefaults: parseTradingDefaultsJson(undefined),
    createdAt: "",
    updatedAt: null,
  });
}

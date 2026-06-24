import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@tauri-apps/api/core";
import { getResolvedUexConfig } from "@/lib/uex/config";
import type { UexApiResponse } from "@/lib/uex/types";

export const DEFAULT_TIMEOUT_MS = 30_000;

export type UexErrorCode = "timeout" | "network" | "http" | "api" | "parse";

export class UexApiError extends Error {
  readonly code: UexErrorCode;
  readonly status?: number;
  readonly endpoint: string;

  constructor(
    message: string,
    code: UexErrorCode,
    endpoint: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "UexApiError";
    this.code = code;
    this.endpoint = endpoint;
    this.status = options?.status;
  }
}

export function getBaseUrl(): string {
  return getResolvedUexConfig().baseUrl;
}

function getAuthToken(): string | undefined {
  return getResolvedUexConfig().token;
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

function shouldUseRustHttp(): boolean {
  return getResolvedUexConfig().useRustHttp && isTauri();
}

function isNetworkFetchError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed");
  }
  return false;
}

async function rustHttpGet(url: string): Promise<string> {
  return invoke<string>("uex_http_get", {
    url,
    token: getAuthToken() ?? null,
  });
}

async function fetchRawText(url: string, signal: AbortSignal): Promise<string> {
  if (shouldUseRustHttp()) {
    return rustHttpGet(url);
  }

  try {
    const res = await fetch(url, { headers: getAuthHeaders(), signal });
    if (!res.ok) {
      throw new UexApiError(`UEX HTTP ${res.status}`, "http", url, { status: res.status });
    }
    return res.text();
  } catch (err) {
    if (isTauri() && isNetworkFetchError(err)) {
      try {
        return await rustHttpGet(url);
      } catch (rustErr) {
        throw new UexApiError(
          rustErr instanceof Error ? rustErr.message : "Rust HTTP failed",
          "network",
          url,
          { cause: rustErr },
        );
      }
    }
    if (err instanceof UexApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new UexApiError("UEX request timed out", "timeout", url, { cause: err });
    }
    throw new UexApiError(
      err instanceof Error ? err.message : "Network error",
      "network",
      url,
      { cause: err },
    );
  }
}

function parseEnvelope<T>(text: string, endpoint: string): T {
  let json: UexApiResponse<T>;
  try {
    json = JSON.parse(text) as UexApiResponse<T>;
  } catch (err) {
    throw new UexApiError("Invalid JSON from UEX", "parse", endpoint, { cause: err });
  }
  if (json.status !== "ok") {
    throw new UexApiError(`UEX API: ${json.status}`, "api", endpoint);
  }
  return json.data;
}

export async function apiFetch<T>(endpoint: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = `${getBaseUrl()}/${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const text = await fetchRawText(url, controller.signal);
    return parseEnvelope<T>(text, endpoint);
  } finally {
    clearTimeout(timer);
  }
}

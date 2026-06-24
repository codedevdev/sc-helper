export const PILOT_MODE_STORAGE_KEY = "sc-trader.trading-routes.pilot-mode";

export function loadPilotMode(): boolean {
  try {
    return localStorage.getItem(PILOT_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function savePilotMode(enabled: boolean): void {
  try {
    localStorage.setItem(PILOT_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

export const PILOT_MODE_MAX_RESULTS = 5;

# SC Helper

Desktop trading companion for Star Citizen — route planning, profit tracking, and live UEX market data.

## Links

| Resource | Link |
|----------|------|
| **Releases** | [GitHub Releases](https://github.com/codedevdev/sc-helper/releases) |
| **UEX Corp API** | [uexcorp.space](https://uexcorp.space) |
| **Issues** | [GitHub Issues](https://github.com/codedevdev/sc-helper/issues) |

## About

SC Helper is a local desktop app for Star Citizen haulers who want profitable routes and clear aUEC tracking in one place. It pulls commodity prices from the [UEX Corp API](https://uexcorp.space), plans trade runs around your ship and budget, and keeps your income, sessions, and goals on your machine — no account required.

All data stays local: SQLite in the desktop app, or `localStorage` when running the web UI in development mode.

## Features

### Trading Routes

- **Single Route** — profitable buy → sell pairs with filters, stock display, and sort by profit, ROI, or profit/min
- **Loop Planner** — circular multi-leg routes (3–7 legs) with system filters and saved loops
- **En Route** — profitable stops while traveling between two terminals
- **Market Lookup** — browse commodity prices and terminal stock across the verse
- **Pilot mode** — simplified top-5 view for quick decisions

Search UX includes typeahead commodity/terminal filters, active filter chips, autoload and stock filters.

### Profit Tracker

- **Dashboard** — current balance, income vs expenses at a glance
- **Transactions** — log income, expenses, and adjustments
- **Farming sessions** — track haul runs with optional linked transactions
- **Goals** — savings targets with progress
- **Analytics** — charts over your trading history

### UEX Integration

- Live market data from UEX Corp
- Configurable API key in **Settings → UEX Corp API**
- Price cache with TTL; offline snapshot in desktop mode (SQLite)
- Optional Rust HTTP proxy for network issues on Windows (Tauri only)

## Download

**Windows:** download the latest `SC Helper_*_x64-setup.exe` from [GitHub Releases](https://github.com/codedevdev/sc-helper/releases).

> Requires Windows 10/11 with [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (pre-installed on Windows 11).

Installers are built automatically by GitHub Actions — no local MSVC setup needed to get a release build.

## Development

### Quick start (browser UI, no Rust/MSVC)

```powershell
git clone https://github.com/codedevdev/sc-helper.git
cd sc-helper
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Trading Routes and the full UI work against live UEX data. Settings and saved data use `localStorage`.

### Desktop app (Tauri, optional local build)

**Prerequisites (Windows):**

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (`rustup default stable`)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++**
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (included on Windows 11)

```powershell
npm install
.\scripts\dev.ps1      # dev with MSVC env
.\scripts\build.ps1    # production installer → src-tauri\target\release\bundle\
```

Or without helper scripts:

```powershell
npm run tauri:dev
npm run tauri:build
```

### Tests and typecheck

```powershell
npm test
npm run build
```

### UEX configuration

**Recommended (desktop):** open **Settings → UEX Corp API** and enter your API key and optional base URL. Values are stored locally and override environment variables.

| Variable | Description |
|----------|-------------|
| `VITE_UEX_API_BASE` | API base URL (default `https://api.uexcorp.space/2.0`) |
| `VITE_UEX_API_TOKEN` | Optional API token |
| `VITE_UEX_USE_RUST_HTTP` | Set to `1` in Tauri to proxy requests via Rust |

**Developer:** create a `.env` file in the project root (not committed) when settings fields are empty.

### Balance logic

Current balance is calculated, not stored:

`startingBalance + totalIncome - totalExpenses + totalAdjustments`

## Releases

Download the Windows installer from **[GitHub Releases](https://github.com/codedevdev/sc-helper/releases)** — look for `SC Helper_*_x64-setup.exe`.

> The **Tags** page only has source code archives (zip/tar.gz). The `.exe` installer is attached to **Releases**, not Tags.

Push a version tag to build a new installer:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions builds the NSIS installer and publishes it to Releases automatically (~10–15 min). To re-run without a new tag: **Actions → Release → Run workflow**.

See [docs/deployment.md](docs/deployment.md) for permissions, verification, and troubleshooting.

## Disclaimer

SC Helper is an unofficial Star Citizen fan tool, not affiliated with Cloud Imperium Games. Star Citizen®, Roberts Space Industries®, and Cloud Imperium® are registered trademarks of Cloud Imperium Rights LLC.

UEX prices are **indicative** only. In-game supply, demand, and stock change constantly; displayed profit and ROI are estimates, not guarantees.

## Tech stack

Tauri 2 · React 19 · TypeScript · Vite · SQLite · Tailwind CSS · [UEX Corp API](https://uexcorp.space)

## License

[MIT](LICENSE)

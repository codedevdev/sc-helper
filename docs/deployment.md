# SC Helper — Deployment & Releases

## Download locations

| Source | URL | Notes |
|--------|-----|-------|
| **GitHub Releases** | https://github.com/codedevdev/sc-helper/releases | Primary — `SC Helper_*_x64-setup.exe` |
| **Tags page** | https://github.com/codedevdev/sc-helper/tags | Source zip/tar.gz only — **not** the installer |
| **Actions artifacts** | Actions → Release workflow → Artifacts | Backup if release upload fails |

## Release triggers

1. **Version tag** — push `v*` (e.g. `v0.1.0`) → [`.github/workflows/release.yml`](../.github/workflows/release.yml)
2. **Manual dispatch** — Actions → Release → Run workflow → enter existing tag name

## Repo permissions (required once)

**Settings → Actions → General → Workflow permissions** → **Read and write permissions**.

Without this, `GITHUB_TOKEN` cannot create GitHub Releases or upload `.exe` assets. The workflow YAML sets `permissions: contents: write`, but the repository default must also allow writes.

## Shipping a new version

1. Bump version in [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) and [`package.json`](../package.json)
2. Commit and push to `main`
3. Tag and push:

```powershell
git tag v0.1.1
git push origin v0.1.1
```

4. Wait for the **Release** workflow (Windows, ~10–15 min)
5. Verify on [Releases](https://github.com/codedevdev/sc-helper/releases):
   - Asset: `SC Helper_<version>_x64-setup.exe`
6. Optional: check Actions → Artifacts for `windows-latest-nsis` backup

## Re-run a failed release

**Option A — re-tag** (same version):

```powershell
git push origin :refs/tags/v0.1.0
git tag -d v0.1.0
git tag v0.1.0
git push origin v0.1.0
```

**Option B — workflow dispatch** (tag must already exist on GitHub):

Actions → Release → Run workflow → tag: `v0.1.0`

## CI (non-release)

Push/PR to `main` runs [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): `npm ci`, `npm test`, `npm run build` on Ubuntu. No Tauri/MSVC required.

## Local desktop build (optional)

Requires MSVC Build Tools. See [README](../README.md#desktop-tauri--optional).

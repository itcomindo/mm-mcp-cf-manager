# MM MCP CF Manager

Unofficial desktop control panel for managing Cloudflare zones via the official Cloudflare MCP server.

**License:** MIT  
**UI language:** English  
**Requirements:** Node.js 24 LTS or newer, Windows 11 (primary target for v1)

## Quick start

1. Install [Node.js 24 LTS](https://nodejs.org/).
2. Open this folder in a terminal and run `npm install` once (requires network).
3. Double-click `create-desktop-shortcut.bat` to create a Desktop shortcut.
4. Launch **MM MCP CF Manager** from the Desktop (runs `run-app.bat` → prepare + start).

The launcher may show a brief Command Prompt window while preparing; it closes automatically once the app window opens. Runtime logs: `%LOCALAPPDATA%\MM-MCP-CF-Manager\launcher.log` and the app `userData` `logs/` folder (Settings → About).

If double-clicking the shortcut does nothing, run **`create-desktop-shortcut.bat`** again (shortcut was updated), then try the Desktop icon once more. On failure, open `%LOCALAPPDATA%\MM-MCP-CF-Manager\launcher.log` or run `run-app.bat` from this folder in a terminal to see errors (Node.js must be **24+** and on PATH for Desktop launches).

### Troubleshooting: “Preload bridge not available”

This means the UI loaded without `window.mmcf` (preload did not attach). The Desktop launcher uses `electron .` with the built files under `out/` — not the Vite dev server.

1. Close the app and run **`run-app.bat`** from this project folder (or recreate the shortcut with **`create-desktop-shortcut.bat`** after updates).
2. Open **`%LOCALAPPDATA%\MM-MCP-CF-Manager\launcher.log`** — look for `[main boot]` lines (preload path, renderer path) and any prepare/start errors.
3. Open app logs under Electron **userData** (`logs/` folder; path is shown in Settings → About when the bridge works).
4. If the log says the built UI is missing, run **`npm run build`** or let `run-app.bat` run **`app:prepare`** again.
5. For development with hot reload, use **`npm run dev`** instead of the Desktop shortcut.

Development:

```bash
npm run dev
npm run test
npm run lint
npm run typecheck
```

## Phase 1 status (complete)

- Electron + React + Vite + Tailwind 4 foundation
- Secure main/preload/IPC with Zod validation
- Application shell (top bar, sidebar, main tabs placeholder)
- Settings (Appearance, Behavior, Data, About) with SQLite persistence in Electron `userData`
- Structured logging with credential redaction
- Source-folder launcher workflow (`run-app.bat`, `scripts/prepare-runtime.mjs`)

## Phase 2 status (complete)

- Official Cloudflare MCP via Streamable HTTP (`https://mcp.cloudflare.com/mcp`)
- API token stored with Electron `safeStorage` in `userData/secrets.json` (encrypted only)
- Settings **Connection**: Save, Test Connection (`whoami`), Sync Zones, Show/Hide/Copy token, Disconnect
- Paginated zone list via reviewed MCP `execute` template; zones cached in SQLite
- Sidebar populated from cached zones (search, multi-select, opened vs selected row states)

### Suggested API token permissions (minimum)

- **User** or **Account** read (for `whoami` / Test Connection)
- **Zone → Zone → Read** (list zones for Sync Zones)

Add write permissions later when enabling DNS/cache/security actions (Phase 4+).

## Phase 3 status (complete)

- Read-only zone tabs: **Overview**, **DNS** (search/filter), **Cache**, **Security**, **WAF**, **Activity** placeholder
- **Refresh Zone** loads live data via reviewed MCP `execute` templates and updates capability cache in SQLite
- **CapabilityService** maps probe results to `available | unavailable | permission_missing | plan_restricted | unknown | loading`
- IPC: `getOverview`, `refresh`, `dns:list`, `cache:getStatus`, `security:getStatus`, `waf:listRules`

### Suggested token permissions for Phase 3 reads

- Everything in Phase 2, plus:
- **Zone → DNS → Read** (DNS tab)
- **Zone → Cache Purge → Read** (cache/dev mode visibility where API allows)
- **Zone → Zone Settings → Read** (security level display)
- **Account → Account WAF → Read** or zone ruleset read scopes as required by your plan (WAF tab)

## Phase 4 status (complete)

Single-zone writes (each with capability gating, resource locks, Dry Run, activity log):

- **Cache** — Purge Everything (confirmation with domain), Development Mode ON/OFF
- **Security** — Under Attack Mode ON/OFF
- **DNS** — add / edit / delete (A, AAAA, CNAME, TXT) with validated forms; delete confirmation
- **WAF** — create / edit / delete / enable-disable custom rules
- **Activity** tab — SQLite `activity` table per zone (no credentials)

Suggested token writes: Zone Cache Purge, Zone Settings Edit, DNS Edit, Account/Zone WAF Edit (as required by your plan).

## Phase 5 status (complete)

- **TaskQueueService** — bounded concurrency (Settings 1–5), SQLite `tasks` / `task_items` snapshots
- Retries on rate limit / transient network errors with backoff (`Retry-After`-style delay via normalizer)
- **Cancel Remaining** for queued/waiting items (no rollback of successful zones)
- IPC: `bulk:preview`, `bulk:createTask`, `tasks:get`, `tasks:listActive`, `tasks:cancel`

## Phase 6 status (complete)

- Sidebar **Bulk Actions** menu when zones are selected
- Preview dialog (eligible / permission missing / domain list) before execute
- **Tasks** drawer from top bar with progress, per-zone results, cancel remaining
- Bulk actions reuse single-zone services: purge, dev mode ON/OFF, Under Attack ON/OFF

## Phase 7 status (complete)

- `npm run postinstall` runs Electron binary install (avoids “Electron uninstall” after `npm install`)
- Automated tests for task preview/eligibility, write runner, schemas (see `npm run test`)
- CSP / sandbox / typed preload channel allowlist unchanged from foundation
- Credentials remain in `safeStorage` only; activity/tasks store no tokens

### v1 manual checklist

1. Desktop shortcut → app starts (`run-app.bat` / `app:prepare`).
2. Save token → Test Connection → Sync Zones.
3. Single-zone purge (confirm) and bulk purge on multiple selections (Tasks panel).
4. Enable **Dry Run** → bulk/single record activity without MCP writes.
5. Disconnect → writes fail gracefully; cached zones remain readable.

Spec: [MM-MCP-CF-Manager-Blueprint.md](MM-MCP-CF-Manager-Blueprint.md)

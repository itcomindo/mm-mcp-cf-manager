# MM MCP CF Manager — Application Blueprint

**Product name:** MM MCP CF Manager  
**Description:** MCP Cloudflare desktop application for managing Cloudflare zones.  
**UI language:** English only.  
**License:** MIT / completely free.  
**Target OS for v1:** Windows 11.  
**Primary owner/use case:** Single-user desktop administration of approximately 30 Cloudflare zones, currently all on the Cloudflare Free plan.  
**Implementation target:** Cursor AI Agent / Composer 2.5.  
**Blueprint date:** 2026-10-11.

---

## 1. Product Goal

Build a lightweight desktop control panel for managing multiple Cloudflare zones from one consistent interface.

The app must support two working modes:

1. **Single-zone management** — select one domain from the sidebar and manage its DNS, cache, security settings, WAF rules, and related zone settings.
2. **Bulk tasks** — select multiple domains and apply the same supported action to every selected zone, with queueing, progress, per-zone status, retry handling, and a final result summary.

The application must use the official Cloudflare MCP server as the Cloudflare integration layer:

```text
https://mcp.cloudflare.com/mcp
```

The v1 application is **not an AI chat application**. MCP must be called deterministically by application services. UI button clicks must map to reviewed application actions, not to an LLM-generated prompt or guessed intent.

---

## 2. Non-Negotiable Requirements

### 2.1 Core

- Electron desktop application.
- TypeScript across the application.
- React for the renderer UI.
- Tailwind CSS for styling.
- English UI.
- MIT license.
- No telemetry.
- No analytics SDK.
- No advertisements.
- No paid dependency required by the application itself.
- Designed primarily for Cloudflare Free zones, but capabilities must still be detected from Cloudflare responses rather than blindly hard-coded.

### 2.2 Distribution / Runtime

Do **not** create an MSI, NSIS installer, Electron Forge installer, electron-builder portable executable, or Windows Store package in v1.

The application is source-folder/runtime based:

```text
Download/extract folder
        ↓
Double-click create-desktop-shortcut.bat
        ↓
Desktop shortcut created
        ↓
Double-click MM MCP CF Manager shortcut
        ↓
run-app.bat
        ↓
prepare runtime if required
        ↓
launch Electron app
```

A local build of renderer/main assets is allowed and expected. The requirement is **no packaged installer/portable EXE distribution**, not “never transpile TypeScript”.

The launcher must automatically prepare dependencies/build only when required. It must not rebuild on every launch when nothing has changed.

### 2.3 Node Runtime

Use **Node.js 24 LTS** as the development/source-runtime baseline.

Reason: current Vite requires Node.js 20.19+ or 22.12+, and Node 18 is EOL. Node 24 is the current LTS line as of this blueprint.

The app launcher must check the system Node major version before doing anything else and show a clear error if the requirement is not met.

### 2.4 Electron Baseline

Pin a stable Electron major/version in `package.json`; do not use alpha/beta/nightly builds.

At blueprint creation time, Electron **44.7.0** is the latest stable release. Do not automatically jump to prerelease Electron 45.

Before final implementation, Cursor should verify that the pinned stable release remains supported and update only if the newer version is stable.

---

# 3. Recommended Stack

```text
Electron 44.x stable
TypeScript
React
Vite
Tailwind CSS 4.x
Zustand
Zod
Official Model Context Protocol TypeScript client SDK
Node built-in node:sqlite (main process only)
Vitest
Playwright (Electron E2E where useful)
ESLint
Prettier
```

### Why `node:sqlite`

Use Electron's bundled Node 24 runtime and `node:sqlite` so the application does not depend on native third-party SQLite modules such as `better-sqlite3`, which would introduce Electron ABI/native rebuild complexity.

Keep all database access inside Electron Main. The renderer must never access the database directly.

If the implementation discovers a blocking issue with `node:sqlite`, use a pure-JS persistent store as fallback. Do not introduce a native module without documenting why.

---

# 4. Cloudflare MCP Architecture

## 4.1 MCP endpoint

Default endpoint:

```text
https://mcp.cloudflare.com/mcp
```

Authentication for this app:

```text
Authorization: Bearer <CLOUDFLARE_API_TOKEN>
```

Use an API Token rather than the legacy Global API Key.

The credential is supplied from the Settings page and stored locally using Electron `safeStorage`.

## 4.2 Official MCP transport

Use the official Model Context Protocol TypeScript client and Streamable HTTP transport.

Conceptual flow:

```text
Renderer UI
    ↓ typed IPC request
Preload contextBridge
    ↓
Electron Main
    ↓
McpClientService
    ↓ Streamable HTTP + Authorization Bearer token
https://mcp.cloudflare.com/mcp
    ↓
Cloudflare API MCP Server
    ↓
Cloudflare API
```

The API token must never be held in long-lived renderer state.

## 4.3 Cloudflare MCP mode

Use Cloudflare MCP's default **Code Mode** in v1.

The official server exposes key tools including:

- `whoami`
- `search`
- `execute`
- `docs`

For production application actions, use **reviewed deterministic `execute` templates**.

Do not generate arbitrary JavaScript from user text. Do not provide a “run arbitrary MCP code” input in the UI.

Example concept:

```text
Purge Cache button
    ↓
CacheService.purgeEverything(zoneId)
    ↓
McpCloudflareAdapter.executeReviewedOperation(...)
    ↓
Cloudflare MCP execute tool
    ↓
POST /zones/{zone_id}/purge_cache
```

The `search` tool may be used by development/diagnostic code to validate endpoint changes, but standard application actions should not need to search the OpenAPI spec on every click.

### Security rule for Code Mode

Any dynamic value inserted into an `execute` code template must be serialized safely. Never concatenate unsanitized domain names, DNS values, expressions, record content, user labels, or IDs directly into executable JavaScript source.

Prefer a small internal encoder/helper that converts all dynamic values with safe serialization before interpolation.

## 4.4 Identity / connection test

`Test Connection` must call MCP `whoami`.

On success store non-secret identity metadata only:

- identity type: user/account;
- identity ID;
- account name/email if returned and appropriate;
- last successful connection timestamp.

Do not log the token.

## 4.5 Zone discovery

Users must **not** manually enter 30 Zone IDs.

After a successful connection, `Sync Zones` must list all zones accessible by the token and cache:

```text
zone_id
account_id
domain/name
status
plan name when returned
last synced timestamp
```

All zone operations use the internal `zone_id` mapping.

The UI may expose Zone ID in an informational details panel, but it is never required user input.

Handle API pagination correctly. Never assume the user has <= 20 zones simply because the current account has about 30.

## 4.6 Capability detection

All current zones are Cloudflare Free plan, but the app must not rely only on the string `Free`.

A feature/action can have states such as:

```text
available
unavailable
permission_missing
plan_restricted
unknown
loading
```

Unsupported operations must be disabled with an explanatory tooltip/message.

---

# 5. Cloudflare Credential Settings

Create a dedicated Settings page.

## 5.1 Connection card

Fields:

```text
MCP Endpoint
API Token
```

Default MCP endpoint:

```text
https://mcp.cloudflare.com/mcp
```

Controls:

```text
[Show/Hide]
[Copy]
[Test Connection]
[Save]
[Disconnect]
```

The user explicitly requires the credential to be viewable.

### Token behavior

- Hidden by default.
- `Show` decrypts and reveals it.
- `Hide` masks it again.
- `Copy` copies the plaintext token only after explicit user action.
- Never display it in toast messages.
- Never write it to logs.
- Never include it in exception serialization.
- Never send it to the renderer except in direct response to an explicit Show/Copy action.
- On window reload/restart, token returns to hidden state.

Use `safeStorage.encryptStringAsync()` / `decryptStringAsync()` when available. Handle `safeStorage.isEncryptionAvailable()` failure explicitly.

Store only the encrypted payload on disk.

## 5.2 Connection status

Display:

```text
Connected / Disconnected
Identity
Zones count
Free zones count
Last zone sync
Last successful MCP request
```

Add `Sync Zones` button.

## 5.3 Permission diagnostics

When the token lacks permission, report the exact category when identifiable:

```text
DNS Read permission missing
DNS Write permission missing
Zone Settings Write permission missing
WAF Write permission missing
Cache Purge permission missing
```

Do not report a plan restriction when the actual response is a credential/permission failure.

---

# 6. Main Window / Application Shell

## 6.1 Layout

Desktop-first two-column application shell:

```text
┌──────────────────────────────────────────────────────────────┐
│ Top bar / app title / connection / task status / settings    │
├───────────────────┬──────────────────────────────────────────┤
│ Sidebar           │ Main Content                             │
│                   │                                          │
│ Domain search     │ Selected domain                           │
│ Select all        │ Tabs                                      │
│ Domain list       │ Overview | DNS | Cache | Security | WAF  │
│ Checkboxes        │                                          │
│                   │ Feature content                           │
└───────────────────┴──────────────────────────────────────────┘
```

Recommended minimum window size:

```text
1100 × 700
```

Remember the last window size and position, but validate bounds so a saved window cannot reopen off-screen after monitor changes.

## 6.2 Top bar

Include:

- application name;
- MCP connection status;
- running task indicator/count;
- global refresh/sync where appropriate;
- Settings button.

Do not overload the top bar with zone actions.

## 6.3 Sidebar

Include:

- search domains;
- domain count;
- multi-select checkbox;
- Select All Visible;
- Clear Selection;
- optional Favorites pin;
- current zone indicator;
- current status indicator;
- `FREE` plan badge;
- scrollable domain list.

Single click domain name = open it.

Checkbox = add/remove from bulk selection without changing the currently opened domain unless intentionally clicked on the row body.

### Selected rows

A checked row and an opened/current row are two different concepts and need visually distinct states.

Example:

```text
opened/current = semantic primary active background
bulk selected  = checkbox + subtle selection tint
both           = active background + selected checkbox
```

---

# 7. Main Content Tabs

Use tabs rather than large accordions for top-level zone areas because DNS and WAF can contain substantial tables.

Recommended v1 tabs:

```text
Overview
DNS
Cache
Security
WAF
Activity
```

## 7.1 Overview

Show:

- domain;
- Zone ID (read-only/copy);
- Account ID (read-only/copy);
- zone status;
- plan;
- development mode status;
- security level / Under Attack status;
- selected SSL/TLS status if permission/API supports it;
- last sync;
- capability summary.

Provide `Refresh Zone`.

## 7.2 DNS

Table columns:

```text
Type
Name
Content
Proxy
TTL
Modified
Actions
```

Support in v1:

- list records;
- search/filter;
- add record;
- edit record;
- delete record;
- proxy toggle where supported;
- refresh.

Use validated forms per DNS record type. Do not reuse one unvalidated generic text form for all record types.

Delete requires confirmation.

DNS write actions must have stronger confirmation in bulk mode than read-only actions.

## 7.3 Cache

Support:

- Purge Everything;
- Purge specific URL(s) if API/token permits;
- Development Mode ON/OFF;
- refresh cache/settings status.

`Purge Everything` is immediate but requires a confirmation dialog showing the target domain.

## 7.4 Security

Support:

- current security level;
- Under Attack Mode enable/disable;
- other Free-plan zone security settings only when actually exposed and permitted by the token.

Under Attack button/state must clearly show current value and pending state.

## 7.5 WAF

At minimum:

- list zone custom rules;
- rule name/description;
- expression summary;
- action;
- enabled/disabled status;
- edit;
- enable/disable;
- add;
- delete;
- refresh.

Show quota/availability when it can be derived reliably from Cloudflare. Do not rely solely on a hard-coded rule limit.

If Cloudflare rejects a rule because it is unavailable on Free plan, present that accurately.

## 7.6 Activity

Show action history for the current zone:

```text
Timestamp
Action
Target
Previous value
New value
Status
Source (single/bulk)
Task ID
Error summary
```

Never store credentials or full authorization headers.

---

# 8. Bulk Tasks

Bulk tasks are a first-class feature, not an afterthought.

## 8.1 Entry point

When one or more sidebar checkboxes are selected, show a stable bulk action bar:

```text
3 domains selected
[Bulk Actions ▾] [Clear Selection]
```

Bulk actions can include:

### Cache

- Purge Everything

### Development

- Development Mode ON
- Development Mode OFF

### Security

- Under Attack Mode ON
- Under Attack Mode OFF

### WAF

Only add bulk WAF actions after single-zone WAF CRUD is stable and tested.

### DNS

Bulk DNS writes are allowed only after the single-zone DNS editor and validation are mature. They require a preview stage and stronger confirmation.

## 8.2 Bulk preview

Before execution show:

```text
Action: Enable Under Attack Mode
Selected zones: 12
Eligible: 12
Unsupported: 0
Permission missing: 0

[Cancel] [Execute]
```

Expandable list must show domains individually.

For destructive/high-impact bulk changes show exactly what will change before execution.

## 8.3 Snapshot selection

When user clicks Execute, copy selected zone IDs into an immutable task snapshot.

Changing sidebar selections afterward must not alter the already-created task.

## 8.4 Queue

Do not use unbounded `Promise.all()` across all selected zones.

Implement a proper queue:

```text
BulkTask
   ├─ zone A → queued/running/success/error
   ├─ zone B → queued/running/success/error
   ├─ zone C → queued/running/success/error
   └─ ...
```

Default concurrency:

```text
3
```

User-adjustable in Settings, suggested range:

```text
1–5
```

Cloudflare response headers remain authoritative. The queue must honor `Retry-After` and any relevant rate-limit information.

## 8.5 Retry policy

Automatic retry only for transient conditions:

- HTTP 429;
- selected network errors;
- selected 5xx errors.

Do not automatically retry obvious validation/auth errors:

- 400;
- 401;
- 403;
- 404 unless specifically known to be eventually consistent.

Suggested max attempts:

```text
3
```

Honor server `Retry-After` before local exponential backoff.

## 8.6 Bulk progress UI

Example:

```text
Purge Cache
18 / 30 completed

██████████████░░░░░░ 60%

Success     17
Failed       1
Running      2
Queued      10

[View Details] [Cancel Remaining]
```

Per-zone result list:

```text
codef.id       Success
example-a.com  Success
example-b.com  Failed — permission denied
example-c.com  Waiting — rate limited
```

## 8.7 Cancellation

Use `AbortController` where supported for in-flight transport requests.

UI wording must be **Cancel Remaining**, not “Rollback”. Already-successful Cloudflare changes cannot generally be undone automatically.

For reversible setting changes, a separate explicit “Revert” task can be offered later using previously captured values.

---

# 9. Task Locking / Conditional UI Logic

This requirement is mandatory.

## 9.1 Button state model

Every async action button must use an explicit state:

```text
idle
loading
running
success
error
disabled
```

Do not allow double-click duplicate requests.

## 9.2 Disable when running

When an action starts:

- disable the initiating button immediately;
- show spinner/progress indicator;
- replace text where useful, e.g. `Purging…`;
- prevent an identical task from being queued twice;
- restore state on completion/failure.

## 9.3 Resource-scoped write locks

Do not freeze the entire application unnecessarily.

Use granular locks such as:

```text
{zoneId}:cache
{zoneId}:dns
{zoneId}:security
{zoneId}:waf
```

Example:

- while `codef.id:cache` is purging, disable other cache writes for `codef.id`;
- DNS reads/navigation may remain available;
- a DNS write can be allowed if it is not blocked by another DNS task.

For bulk tasks, acquire the relevant resource lock for each affected zone as it executes.

## 9.4 Stale-state prevention

After a successful write:

1. update local state from confirmed response;
2. trigger a targeted refresh if the Cloudflare API response is insufficient;
3. never optimistically claim success before MCP/Cloudflare confirms it.

## 9.5 Navigation while running

Navigation/read-only views should remain usable during background queue execution.

The global top bar must show active task count so the user does not lose track of an ongoing bulk operation.

---

# 10. UI / UX Design System

The GUI must be consistent throughout the application.

## 10.1 Tailwind strategy

Use Tailwind CSS 4.x.

Do not scatter arbitrary hard-coded colors in components.

Define semantic design tokens using CSS variables and consume those tokens through Tailwind utilities.

Suggested semantic tokens:

```text
--background
--foreground
--surface
--surface-elevated
--muted
--muted-foreground
--border
--input
--primary
--primary-foreground
--accent
--accent-foreground
--success
--warning
--danger
--focus-ring
```

Provide values for both light and dark resolved themes.

## 10.2 Theme options

Settings > Appearance:

```text
Theme
○ System (default)
○ Light
○ Dark
```

**Default = System.**

Use an attribute strategy such as:

```html
<html data-theme="light">
<html data-theme="dark">
```

The stored preference is:

```text
system | light | dark
```

For `system`, observe:

```text
(prefers-color-scheme: dark)
```

and update live when Windows theme changes while the app is running.

Persist the user's explicit theme choice.

Avoid flash of the wrong theme during application startup.

## 10.3 Font size options

Settings > Appearance:

```text
Font Size
[SM] [S] [MD] [L]
```

Keep these exact four labels as requested.

Recommended scale:

```text
SM → root UI scale 12px
S  → root UI scale 13px
MD → root UI scale 14px (default)
L  → root UI scale 16px
```

Do not implement this by manually changing every component.

Use a root attribute/token:

```html
<html data-font-size="md">
```

and typography variables so components inherit consistently.

Table density/padding may scale modestly with font size, but controls must not become unusably small at `SM`.

## 10.4 Buttons

Create one reusable Button component with variants:

```text
primary
secondary
ghost
destructive
```

and sizes:

```text
sm
md
lg
icon
```

Every button supports:

```text
default
hover
active
focus-visible
disabled
loading
```

### Adaptive states

**Primary active**
- semantic primary background;
- contrasting foreground;
- stronger active/pressed state;
- adaptive in light/dark mode.

**Secondary/inactive**
- surface background;
- border;
- foreground;
- hover uses semantic muted/accent surface.

**Disabled**
- visually subdued;
- `cursor-not-allowed`;
- no click handler execution;
- `aria-disabled`/native disabled state as appropriate.

**Loading/running**
- disabled;
- spinner;
- text remains understandable;
- button width should not jump drastically.

Do not use one-off button colors in individual pages.

## 10.5 Toggle controls

Build a reusable Toggle/Switch component for:

- Development Mode;
- Under Attack Mode;
- DNS proxied state;
- WAF enabled state where appropriate.

Toggle states:

```text
off
on
pending
disabled
error
```

Never change the visible state to ON solely because the user clicked. Show pending state until Cloudflare confirms success.

## 10.6 Feedback

Use:

- inline field errors for form validation;
- toasts for short success/error notices;
- persistent task panel for bulk tasks;
- skeleton/loading rows for initial table loading;
- empty states for no rules/no DNS results;
- retry button for failed read requests.

Avoid modal dialogs for routine read failures.

## 10.7 Accessibility

Minimum requirements:

- keyboard focus visible;
- proper button elements rather than clickable divs;
- labels for inputs;
- `aria-live` for task status where useful;
- icon-only buttons have accessible labels/tooltips;
- adequate contrast in both themes;
- dialogs trap focus and restore it when closed;
- Escape closes non-critical dialogs.

## 10.8 Destructive actions

Use destructive variant only for genuinely destructive actions such as DNS/WAF delete.

Do not make `Purge Cache` look identical to `Delete DNS Record`; use warning/confirmation semantics appropriate to impact.

---

# 11. Additional UX Features to Include

These are part of the blueprint, not optional “nice someday” ideas unless marked later.

## 11.1 Domain search

Fast client-side domain filter in sidebar.

Keyboard shortcut:

```text
Ctrl+K → focus domain search
```

Only if it does not conflict with native behavior.

## 11.2 Refresh behavior

Each major tab gets a scoped Refresh button.

Do not force a full app reload to refresh Cloudflare data.

## 11.3 Last-updated indicator

For data that may become stale, display:

```text
Last updated 10:32:14
```

## 11.4 Dirty form protection

If a DNS/WAF editor contains unsaved changes and the user navigates away, ask before discarding.

## 11.5 Dry Run mode

Settings > Behavior:

```text
Dry Run [OFF]
```

When ON:

- read operations work normally;
- write actions show the exact target/action in the task preview;
- no write MCP execution is sent;
- Activity records result as `dry_run`.

This is especially useful while testing bulk operations.

The top bar must clearly display `DRY RUN` while active.

## 11.6 Activity retention

Configurable retention:

```text
30 days
90 days (default)
180 days
Forever
```

No credentials in history.

## 11.7 Export task result

Bulk task result can be exported to JSON or CSV later in v1 if implementation cost is small. Do not block initial core completion on this feature.

---

# 12. Settings Page

Recommended structure:

```text
Settings
├── Connection
├── Appearance
├── Behavior
├── Data
└── About
```

## 12.1 Connection

```text
MCP Endpoint
API Token [Show] [Copy]
Connection status
Identity
Test Connection
Save
Disconnect
Sync Zones
```

## 12.2 Appearance

```text
Theme: System / Light / Dark
Font Size: SM / S / MD / L
Sidebar: Expanded / Compact (optional)
```

## 12.3 Behavior

```text
Bulk concurrency: 1–5, default 3
Max retry attempts: default 3
Dry Run: off by default
Confirm single high-impact actions: on
Confirm bulk actions: always on and cannot be disabled
```

## 12.4 Data

```text
Database location [Open Folder]
Activity retention
Clear cached zone data
Clear activity history
Reset UI preferences
```

Do not combine `Clear cached zone data` with `Clear credentials`.

## 12.5 About

Show:

```text
MM MCP CF Manager
Version
License: MIT
Free software
Unofficial Cloudflare management application
Not affiliated with or endorsed by Cloudflare, Inc.
```

Include links to license/source only if configured by the project owner.

---

# 13. Persistence Model

Use the OS-specific Electron `userData` directory for application-generated data rather than writing mutable state into the source code directory.

Example conceptual files:

```text
<userData>/
├── mm-mcp-cf-manager.sqlite
├── secrets.json       # encrypted payload only
└── logs/
```

Do not store credentials in SQLite plaintext.

## 13.1 Suggested tables

### zones

```text
id
zone_id UNIQUE
account_id
domain
status
plan_name
capabilities_json
last_synced_at
created_at
updated_at
```

### app_settings

```text
key PRIMARY KEY
value_json
updated_at
```

Do not put API token plaintext here.

### tasks

```text
id
kind
source            # single | bulk | dry_run
state
selected_count
created_at
started_at
finished_at
summary_json
```

### task_items

```text
id
task_id
zone_id
domain
action
resource
state
attempts
previous_value_json
requested_value_json
result_json
error_code
error_message
started_at
finished_at
```

### activity

May reuse task/task_items or have a denormalized read model if needed.

## 13.2 SQLite safety

- prepared statements only;
- foreign keys enabled;
- never interpolate SQL values;
- migration table with schema version;
- backup database before destructive migration;
- handle locked/corrupt DB errors clearly.

---

# 14. Electron Security Requirements

Mandatory BrowserWindow settings/concepts:

```text
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

Use a preload script with `contextBridge`.

Do not expose raw `ipcRenderer` to renderer code.

Expose narrow typed functions only, for example:

```text
window.mmcf.zones.list()
window.mmcf.zones.refresh(zoneId)
window.mmcf.cache.purgeEverything(zoneId)
window.mmcf.bulk.createTask(...)
window.mmcf.settings.getAppearance()
```

Every Main IPC handler must:

- validate input using Zod;
- validate sender/origin where applicable;
- enforce the same permission/action constraints as the UI;
- return typed success/error envelopes.

Add restrictive Content Security Policy.

Do not load remote UI code into the renderer.

External links, if any, must be allowlisted before `shell.openExternal`.

Disable unexpected window creation/navigation.

---

# 15. Application Service Boundaries

Recommended directories:

```text
src/
├── main/
│   ├── app/
│   ├── ipc/
│   ├── mcp/
│   ├── cloudflare/
│   │   ├── zones/
│   │   ├── dns/
│   │   ├── cache/
│   │   ├── security/
│   │   └── waf/
│   ├── tasks/
│   ├── persistence/
│   ├── security/
│   └── logging/
│
├── preload/
│   ├── index.ts
│   └── api-types.ts
│
├── renderer/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── feedback/
│   ├── features/
│   │   ├── zones/
│   │   ├── dns/
│   │   ├── cache/
│   │   ├── security/
│   │   ├── waf/
│   │   ├── bulk-tasks/
│   │   ├── activity/
│   │   └── settings/
│   ├── stores/
│   ├── hooks/
│   └── styles/
│
└── shared/
    ├── schemas/
    ├── types/
    ├── constants/
    └── errors/
```

Core services:

```text
McpClientService
CloudflareMcpAdapter
CredentialService
ZoneService
DnsService
CacheService
SecurityService
WafService
CapabilityService
TaskQueueService
ActivityService
SettingsService
DatabaseService
```

Do not put Cloudflare/MCP request code inside React components.

---

# 16. MCP Error Model

Normalize raw transport/API errors into application errors:

```text
CONNECTION_FAILED
AUTH_INVALID
AUTH_PERMISSION_MISSING
ZONE_NOT_FOUND
PLAN_RESTRICTED
VALIDATION_FAILED
RATE_LIMITED
CLOUDFLARE_API_ERROR
MCP_PROTOCOL_ERROR
MCP_TOOL_ERROR
NETWORK_ERROR
CANCELLED
UNKNOWN
```

Each normalized error should contain:

```text
code
safe message
operation
zone/domain when applicable
retryable boolean
retryAfterMs when known
technical details for local debug log (sanitized)
```

Never expose authorization headers.

---

# 17. Logging

Use structured local logs.

Levels:

```text
error
warn
info
debug
```

Default production/source-run level: `info`.

Redact:

```text
Authorization
Bearer token
API token
cookies
OAuth secrets if OAuth is ever added
```

Task history and technical logs are different concepts.

Do not flood activity history with MCP protocol handshakes.

---

# 18. Network / Connectivity Behavior

## Offline/disconnected

If MCP is unreachable:

- app shell still opens;
- cached zones may be displayed as stale;
- all write actions disabled;
- clear `Disconnected` status shown;
- `Retry Connection` available.

Never queue Cloudflare writes indefinitely while offline unless the user explicitly submits them after reconnection.

## Timeouts

Every MCP request needs an explicit timeout/AbortSignal.

Do not allow a single stalled request to leave buttons permanently disabled.

---

# 19. Cloudflare Free-Plan Design Rules

All current zones are Free, therefore optimize the default UX around available Free-plan features.

However:

- do not fake unavailable paid functionality;
- do not assume a feature is available based solely on plan name;
- honor Cloudflare response/entitlement/permission information;
- show disabled state with reason;
- rate limits must be respected dynamically;
- a single zone failure must not fail the entire bulk task.

The application should remain structurally compatible if a zone is upgraded later.

---

# 20. Shortcut / Source-Run Strategy

Root files expected:

```text
MM-MCP-CF-Manager/
├── create-desktop-shortcut.bat
├── run-app.bat
├── package.json
├── package-lock.json
├── scripts/
│   └── prepare-runtime.mjs
├── src/
├── assets/
│   └── app.ico
└── ...
```

## 20.1 `run-app.bat`

Responsibilities:

1. switch current directory to application root;
2. verify `node` and `npm` exist;
3. verify Node major version >= 24;
4. call `npm run app:prepare`;
5. stop with visible error if preparation fails;
6. launch `npm run app:start` in a minimized/hidden console while Electron window remains visible;
7. never echo secrets.

## 20.2 `scripts/prepare-runtime.mjs`

Responsibilities:

- determine whether dependencies are missing/out-of-date;
- run `npm ci` only when required;
- determine whether build output is missing/stale;
- run local build only when required;
- create/update a runtime build stamp based on package lock + relevant source state;
- return non-zero exit code with a clear message on failure.

First run may require internet access to download npm dependencies/Electron binary.

There is no Windows application installation and no registry installation.

## 20.3 Desktop shortcut

`create-desktop-shortcut.bat` must:

- detect its own application directory;
- create `MM MCP CF Manager.lnk` on the current user's Desktop;
- point to `run-app.bat`;
- set Working Directory to app root;
- use `assets/app.ico` if present;
- replace/update an existing shortcut with the same name;
- show a concise success/failure message;
- require no Administrator privileges.

---

# 21. Package Scripts Contract

Cursor should implement at least:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "test": "...",
    "lint": "...",
    "typecheck": "...",
    "app:prepare": "node scripts/prepare-runtime.mjs",
    "app:start": "..."
  }
}
```

Exact build tooling command can follow the selected Vite/Electron integration, but the user-facing `.bat` files must not depend on manually typing npm commands.

---

# 22. Testing Requirements

Do not consider the app complete until the following are covered.

## 22.1 Unit tests

Required areas:

- theme resolution;
- font scale resolution;
- Zod IPC schemas;
- credential redaction helpers;
- safe MCP code/value serialization;
- task queue concurrency;
- `Retry-After` handling;
- retry eligibility;
- resource locks;
- capability mapping;
- bulk immutable selection snapshot;
- task summaries.

## 22.2 Integration tests with mocked MCP

Mock:

- `whoami` success/failure;
- zone list/pagination;
- DNS CRUD;
- purge cache;
- Development Mode;
- Under Attack Mode;
- WAF CRUD;
- 401/403;
- 429 + Retry-After;
- 5xx;
- MCP transport timeout.

No test suite should mutate live Cloudflare zones by default.

## 22.3 UI tests

Verify:

- System theme is default;
- Light/Dark/System persist;
- system theme follows OS change when `System` selected;
- SM/S/MD/L font setting applies globally;
- running button is disabled;
- duplicate click does not create duplicate task;
- error returns button to usable state;
- bulk selection is immutable after task begins;
- destructive dialogs list correct domain/action;
- token is masked by default;
- token reveal/copy requires explicit action;
- token does not appear in logs.

## 22.4 Dry-run smoke test

Before first live mutation, run bulk operations in Dry Run mode against all zones and verify generated targets/actions.

---

# 23. Cursor Composer 2.5 Implementation Rules

Give Cursor this blueprint as the source of truth.

Cursor must:

1. implement in phases;
2. not replace MCP with direct REST silently;
3. not add an LLM runtime dependency;
4. not package an installer/portable EXE;
5. not store the API token in plaintext;
6. not expose Node APIs to renderer;
7. not use unbounded bulk concurrency;
8. not use `Promise.all()` for an entire multi-zone mutation set;
9. not enable write buttons before capability/permission status is known;
10. not mark a write successful before Cloudflare confirms it;
11. not log API credentials;
12. not invent Cloudflare endpoint behavior—verify against current official API/MCP docs when implementing each service;
13. keep components small and reusable;
14. keep UI strings in one centralized English strings module where practical;
15. use strict TypeScript and avoid `any` except at explicitly isolated external boundaries;
16. create tests alongside each service rather than at the very end.

---

# 24. Implementation Phases

## Phase 1 — Foundation

- Electron + React + TypeScript + Vite + Tailwind.
- secure BrowserWindow/preload/IPC architecture.
- design tokens.
- System/Light/Dark theme.
- SM/S/MD/L font sizes.
- application shell/sidebar/main content.
- SQLite/settings layer.
- logging/redaction.
- launcher/shortcut workflow.

**Exit criteria:** app launches from shortcut, settings persist, no Cloudflare connection required yet.

## Phase 2 — MCP connection

- `McpClientService`.
- API token secure storage.
- Settings Connection UI.
- Show/Hide/Copy token.
- Test Connection via `whoami`.
- Sync zones with pagination.
- sidebar populated from Cloudflare.

**Exit criteria:** approximately 30 zones load automatically with internal Zone IDs.

## Phase 3 — Read-only zone views

- Overview.
- DNS list.
- Cache/settings status.
- Security status.
- WAF list.
- capability mapping.
- refresh/stale state.

**Exit criteria:** app can inspect all zones without write capability.

## Phase 4 — Single-zone writes

Implement and test separately:

1. Purge cache.
2. Development Mode.
3. Under Attack Mode.
4. DNS CRUD.
5. WAF CRUD/toggle.

Do not implement all writes simultaneously before validating the first ones.

**Exit criteria:** each action has validation, conditional disable state, confirmation where appropriate, activity entry, and error recovery.

## Phase 5 — Task engine

- queue;
- resource locks;
- concurrency;
- retry;
- Retry-After;
- cancellation;
- immutable task snapshots;
- persistent task state;
- progress UI.

**Exit criteria:** simulated 30-zone task can complete with mixed success/error/rate-limit responses.

## Phase 6 — Bulk actions

Initial bulk set:

- Purge Everything;
- Development Mode ON/OFF;
- Under Attack Mode ON/OFF.

Only after stable:

- selected WAF bulk operations;
- selected DNS bulk operations.

**Exit criteria:** one failing zone never aborts unrelated queued zones and final summary is accurate.

## Phase 7 — Hardening

- E2E tests;
- CSP review;
- IPC audit;
- credential redaction audit;
- DB migration/recovery test;
- offline behavior;
- shortcut on fresh folder;
- first-run dependency preparation;
- final README.

---

# 25. Definition of Done

The application is considered v1 complete only when all statements below are true:

- App can be launched from a Desktop shortcut created by the supplied BAT file.
- No Windows installer or portable packaged EXE is required.
- Connection is made to official Cloudflare MCP.
- API token can be securely saved, shown, hidden, and copied.
- Zone IDs are discovered automatically.
- Sidebar lists all accessible zones.
- Current zone can be managed independently.
- DNS management works with validation.
- Cache purge works.
- Development Mode works.
- Under Attack Mode works.
- Free-plan WAF operations supported by Cloudflare/token work.
- Multi-domain bulk selection works.
- Bulk Purge/Development/Under Attack operations use a queue.
- Retry-After/rate-limit handling works.
- Per-zone success/failure is visible.
- Buttons are disabled while their conflicting task is running.
- Duplicate writes are prevented.
- Theme options System/Light/Dark work; System is default.
- Font sizes SM/S/MD/L work globally.
- UI design is consistent in light and dark mode.
- Settings and app state persist across restarts.
- Credentials never appear in logs or SQLite plaintext.
- Renderer has no direct Node/MCP/database access.
- Core services have tests.
- Dry Run mode works.
- App remains usable if MCP is temporarily offline.
- MIT license is included.

---

# 26. Suggested First Main-Screen Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ MM MCP CF Manager       ● Connected             Tasks: 0        ⚙ Settings │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ Search domains...       │ codef.id                                  FREE   │
│                         │                                                   │
│ □ Select all visible    │ Overview  DNS  Cache  Security  WAF  Activity   │
│                         │ ────────────────────────────────────────────────  │
│ ☑ codef.id              │                                                   │
│ □ domain-a.com          │ Zone Status                 Active                │
│ □ domain-b.com          │ Development Mode            OFF                   │
│ □ domain-c.com          │ Under Attack                OFF                   │
│ □ domain-d.com          │ Plan                        Free                  │
│ ...                     │                                                   │
│                         │ Capabilities                                      │
│ 1 selected              │ DNS Read/Write               ✓                    │
│ [Bulk Actions ▼]        │ Cache Purge                  ✓                    │
│                         │ WAF                           ✓                    │
│                         │                                                   │
│                         │ [Refresh Zone]                                    │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

# 27. Suggested Settings Wireframe

```text
Settings

Connection | Appearance | Behavior | Data | About

Cloudflare MCP
────────────────────────────────────────────────────────
MCP Endpoint
[ https://mcp.cloudflare.com/mcp                         ]

API Token
[ •••••••••••••••••••••••••••••••••••••••••••••••• ]
[Show] [Copy]

Status       ● Connected
Identity     user/account identity
Zones        30
Last Sync    2026-10-11 10:42

[Test Connection] [Save] [Sync Zones] [Disconnect]
```

Appearance:

```text
Theme
[ System ] [ Light ] [ Dark ]

Font Size
[ SM ] [ S ] [ MD ] [ L ]
```

Behavior:

```text
Bulk concurrency     [ 3 ]
Max retries          [ 3 ]
Dry Run              [ OFF ]
```

---

# 28. Official References Verified for This Blueprint

Use current official documentation during implementation, especially because MCP/API behavior can change.

1. **Cloudflare MCP Server**  
   https://github.com/cloudflare/mcp  
   Official MCP URL, OAuth/API Token authentication, Code Mode, `search`, `execute`, `whoami`, and account token auto-detection notes.

2. **Model Context Protocol TypeScript SDK**  
   https://github.com/modelcontextprotocol/typescript-sdk  
   Streamable HTTP client transport and connection model.

3. **Electron Security**  
   https://www.electronjs.org/docs/latest/tutorial/security/  
   Context isolation, sandbox, IPC validation, CSP, navigation/window restrictions.

4. **Electron Context Isolation**  
   https://www.electronjs.org/docs/latest/tutorial/context-isolation

5. **Electron safeStorage**  
   https://www.electronjs.org/docs/latest/api/safe-storage  
   OS-backed credential encryption; current docs recommend async encryption/decryption APIs.

6. **Electron Stable Releases**  
   https://releases.electronjs.org/?channel=stable

7. **Tailwind Dark Mode**  
   https://tailwindcss.com/docs/dark-mode  
   Three-way Light/Dark/System pattern and attribute-based dark variant.

8. **Vite Getting Started / Node Compatibility**  
   https://vite.dev/guide/

9. **Node.js Releases**  
   https://nodejs.org/en/about/previous-releases  
   Node 24 LTS; Node 18 EOL.

10. **Node.js SQLite**  
    https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html

---

# 29. Final Instruction to Cursor Agent

Build **MM MCP CF Manager** according to this blueprint. Treat reliability and safe multi-zone mutation as higher priority than adding many Cloudflare features quickly.

Start with the foundation and connection layer, then implement one fully tested write path (`Purge Everything`) end-to-end before expanding to other writes. Once the single-zone action architecture is proven, implement the queue and bulk version using the same service—not duplicated logic.

Every user-triggered mutation must have a clear target zone snapshot, explicit running state, error result, and audit/activity record. Never let a renderer component call MCP directly.

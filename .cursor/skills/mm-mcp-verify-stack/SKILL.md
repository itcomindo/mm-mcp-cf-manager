---
name: mm-mcp-verify-stack
description: Verifies Node 24+, stable Electron pin, and dependency upgrades against official docs. Use when editing package.json, Electron/Vite versions, or MCP SDK integration.
disable-model-invocation: true
---

# Verify stack versions

## Baselines (blueprint §2.3–2.4, §3)

| Item | Requirement |
|------|-------------|
| Node (dev + launcher) | Major **≥ 24** LTS |
| Electron | Stable only — **44.x** baseline at blueprint time; upgrade only if newer **stable** verified |
| Vite | Node 20.19+ / 22.12+ compatible ( satisfied by Node 24 ) |
| SQLite | `node:sqlite` in **main** only; no `better-sqlite3` unless documented exception |

## Steps

1. Read `package.json` engines/scripts if present; align with §21 (`app:prepare`, `app:start`, `dev`, `build`, `test`, `lint`, `typecheck`).
2. Confirm `run-app.bat` checks Node major ≥ 24 (already in repo root).
3. Before bumping Electron or `@modelcontextprotocol/*`:
   - Use **Context7 MCP** (`resolve-library-id` → `query-docs`) for Electron security, MCP TypeScript SDK, and Cloudflare MCP server.
   - No alpha/beta/nightly Electron.
4. After bump: run `npm run typecheck`, `test`, and manual launch via shortcut path when app exists.

## Out of scope for v1

Adding electron-builder, MSI, portable EXE, or Windows Store packaging — reject unless blueprint changes.

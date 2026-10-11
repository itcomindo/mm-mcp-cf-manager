---
name: mm-mcp-implement-phase
description: Implements one blueprint phase (1–7) with exit criteria. Use when the user says Phase N, foundation, MCP connection, task engine, bulk actions, or hardening.
disable-model-invocation: true
---

# Implement one blueprint phase

## Before coding

1. Run skill **mm-mcp-blueprint** (or read blueprint §24 for the target phase).
2. Confirm prerequisites from prior phases are done (e.g. no zone writes before MCP + read-only views).

## Phase checklist (§24)

| Phase | Focus | Exit signal |
|-------|--------|-------------|
| 1 | Electron+React+Vite+Tailwind, shell, SQLite settings, logging, launchers | Shortcut launch; settings persist; no CF required |
| 2 | McpClient, token storage, Connection UI, whoami, sync zones paginated | ~30 zones in sidebar |
| 3 | Overview, DNS list, cache/security/WAF read, capabilities, refresh | Inspect all zones, no writes |
| 4 | Single-zone writes **sequentially**: purge → dev mode → UAM → DNS → WAF | Each action tested with confirm, activity, errors |
| 5 | Task queue, locks, retry, Retry-After, cancel, snapshots, progress UI | 30-zone mixed outcomes simulated |
| 6 | Bulk purge/dev/UAM; WAF/DNS bulk only after single-zone stable | One failure does not abort others |
| 7 | E2E, CSP/IPC/credential audits, offline, fresh-folder shortcut, README | §25 satisfied |

## Rules while implementing

- Do not implement all Phase 4 writes at once.
- No installer/portable EXE; keep `run-app.bat` + `app:prepare` contract (§20–21).
- Add tests with new services (§23.15).

## Done

State exit criteria met, commands run (`lint`, `typecheck`, `test` when available), and what remains for the next phase.

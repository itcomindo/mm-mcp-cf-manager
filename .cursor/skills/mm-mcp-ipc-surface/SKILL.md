---
name: mm-mcp-ipc-surface
description: Adds a typed preload API and main IPC handler for window.mmcf. Use when exposing new renderer capabilities or extending the contextBridge surface.
disable-model-invocation: true
---

# Add IPC / preload surface

## Layout (§15)

- Schemas: `src/shared/schemas/`
- Handler: `src/main/ipc/` (register from app bootstrap)
- Preload: `src/preload/index.ts` + `api-types.ts`
- Renderer: thin client calling `window.mmcf.*` only

## Steps

1. **Define Zod schema** for request (and response shape) in `src/shared/schemas/`.
2. **Export TypeScript types** inferred from Zod in `src/shared/types/` if needed.
3. **Implement `ipcMain.handle('mmcf:...', ...)`**:
   - `schema.parse(input)`
   - call appropriate main service
   - return `{ ok: true, data }` or `{ ok: false, error: NormalizedAppError }`
4. **Preload**: expose one function on `contextBridge` under `mmcf` namespace — channel name allowlisted; no generic invoke from renderer.
5. **Renderer**: use typed wrapper; no secrets in props/state except transient Show/Copy flows (§5.1).
6. **Tests**: schema edge cases; handler with mocked services.

## Naming

Prefer domain grouping: `window.mmcf.zones.*`, `window.mmcf.cache.*`, `window.mmcf.bulk.*`, `window.mmcf.settings.*` (§14 examples).

## Security review

Matches blueprint §14: sandbox, context isolation, CSP unchanged or tightened — not loosened.

---
name: mm-mcp-add-write-action
description: Adds a reviewed Cloudflare write action (purge, DNS, WAF, security toggle) end-to-end. Use for new mutations, bulk actions, or extending Cache/Security/WAF/DNS features.
disable-model-invocation: true
---

# Add a write action (single-zone first)

## Flow (mandatory order)

```text
UI button (renderer)
  → window.mmcf.<domain>.<action>(...)
  → IPC (Zod-validated)
  → *Service in src/main/cloudflare/<area>/
  → CloudflareMcpAdapter.executeReviewedOperation(reviewedTemplate, safeParams)
  → MCP execute
  → normalize error (§16) + activity record
```

## Checklist

1. **Service** in `src/main/cloudflare/` — no fetch/MCP inside React.
2. **Reviewed execute template** — load skill **mm-mcp-safe-execute** for dynamic values.
3. **Capability** — disable with tooltip if `permission_missing` / `plan_restricted` / `unknown` (§4.6).
4. **Confirmation** for destructive/high-impact (§10.8, §7.3 purge).
5. **Running state** — resource locks; disable duplicate clicks (§9).
6. **Activity** — timestamp, action, status, task id when applicable; no credentials (§7.6).
7. **Tests** — unit for serialization/validation; integration with mocked MCP (§22).
8. **Bulk** — only after single-zone stable; reuse same service via TaskQueueService (§29), never duplicate Cloudflare logic.

## First write in a greenfield app

Prove **Purge Everything** end-to-end before other writes (blueprint §29).

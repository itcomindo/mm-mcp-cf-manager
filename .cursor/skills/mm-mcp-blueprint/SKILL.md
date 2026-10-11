---
name: mm-mcp-blueprint
description: Aligns work with MM-MCP-CF-Manager-Blueprint.md. Use when starting a major feature, entering a new implementation phase, resolving spec conflicts, or approaching v1 Definition of Done.
disable-model-invocation: true
---

# MM MCP Blueprint alignment

## When to use

- New feature area (DNS, WAF, bulk, settings).
- Uncertainty about architecture, security, or Cloudflare integration.
- Before claiming a phase or v1 complete.

## Steps

1. Open [MM-MCP-CF-Manager-Blueprint.md](../../../MM-MCP-CF-Manager-Blueprint.md) at repo root.
2. Identify current **Phase 1–7** (§24) and read that phase’s deliverables + exit criteria only — avoid implementing later phases early.
3. Cross-check **Non-Negotiable Requirements** (§2) and **Cursor Implementation Rules** (§23).
4. For mutations, re-read **§29**: one proven write path before expanding; bulk reuses services.
5. Near release, walk **Definition of Done** (§25) as a checklist.

## Output

Summarize: which phase applies, which blueprint sections govern the change, and any explicit out-of-scope items for this task.

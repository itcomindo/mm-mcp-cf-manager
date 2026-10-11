---
name: mm-mcp-safe-execute
description: Authors or reviews Cloudflare MCP Code Mode execute templates with safe dynamic value serialization. Use when writing executeReviewedOperation templates, DNS/WAF expressions, or any interpolated MCP JavaScript.
disable-model-invocation: true
---

# Safe MCP execute templates

## Non-negotiable (§4.3)

Dynamic values (zone IDs, domains, record names, content, WAF expressions, user labels) must **not** be concatenated into JS source as raw strings.

Use a single internal helper (e.g. `serializeForExecuteTemplate(value: unknown): string`) that produces only safe literal fragments (JSON.stringify, quoted escapes, allowlisted enums).

## Review checklist

- [ ] Template is **reviewed** and named — not generated from user free text at runtime.
- [ ] All parameters pass through the encoder; no `eval`, no `Function`, no user-supplied code blocks.
- [ ] IDs validated as expected format (Zod) before reaching adapter.
- [ ] Errors from MCP mapped to app codes; logs sanitized (§16–17).
- [ ] Unit tests: malicious inputs (quotes, newlines, script-like strings) do not break out of literals.

## Example pattern

```typescript
// BAD
const code = `await purge("${zoneId}");`;

// GOOD
const code = buildReviewedPurgeTemplate(serializeForExecuteTemplate(zoneId));
```

## When unsure

Fetch current Cloudflare MCP / API docs (Context7 MCP: Cloudflare MCP server, MCP TypeScript SDK) before assuming tool or execute behavior.

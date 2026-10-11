const REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /authorization\s*:\s*bearer\s+\S+/gi, replacement: 'Authorization: Bearer [REDACTED]' },
  { pattern: /bearer\s+\S+/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /api[_-]?token\s*[:=]\s*\S+/gi, replacement: 'apiToken=[REDACTED]' },
  { pattern: /"apiToken"\s*:\s*"[^"]*"/gi, replacement: '"apiToken":"[REDACTED]"' },
  { pattern: /"token"\s*:\s*"[^"]*"/gi, replacement: '"token":"[REDACTED]"' },
]

export function redactSensitiveText(input: string): string {
  let output = input
  for (const { pattern, replacement } of REPLACEMENTS) {
    output = output.replace(pattern, replacement)
  }
  return output
}

export function redactUnknown(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactSensitiveText(value)
  }
  if (Array.isArray(value)) {
    return value.map(redactUnknown)
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(record)) {
      if (/token|authorization|secret|password/i.test(key)) {
        next[key] = '[REDACTED]'
      } else {
        next[key] = redactUnknown(entry)
      }
    }
    return next
  }
  return value
}

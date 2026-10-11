import { describe, expect, it } from 'vitest'
import { redactSensitiveText, redactUnknown } from './redact'

describe('redactSensitiveText', () => {
  it('redacts bearer tokens in strings', () => {
    const input = 'Authorization: Bearer abc.def.ghi'
    expect(redactSensitiveText(input)).not.toContain('abc.def.ghi')
    expect(redactSensitiveText(input)).toContain('[REDACTED]')
  })
})

describe('redactUnknown', () => {
  it('redacts sensitive object keys', () => {
    const result = redactUnknown({ apiToken: 'secret-value', zoneId: 'z1' }) as Record<
      string,
      unknown
    >
    expect(result.apiToken).toBe('[REDACTED]')
    expect(result.zoneId).toBe('z1')
  })
})

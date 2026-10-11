import { describe, expect, it } from 'vitest'
import { createDnsRecordSchema } from './write-actions.schema'

describe('createDnsRecordSchema', () => {
  it('accepts valid A record payload', () => {
    const parsed = createDnsRecordSchema.safeParse({
      zoneId: 'abc',
      type: 'A',
      name: 'www.example.com',
      content: '192.0.2.1',
      ttl: 1,
      proxied: true,
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects empty content', () => {
    const parsed = createDnsRecordSchema.safeParse({
      zoneId: 'abc',
      type: 'TXT',
      name: '_txt.example.com',
      content: '',
    })
    expect(parsed.success).toBe(false)
  })
})

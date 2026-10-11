import { describe, expect, it } from 'vitest'
import { createIpAccessRuleSchema, deleteIpAccessRuleSchema } from './ip-access.schema'

describe('ip-access schemas', () => {
  it('accepts valid IPv4 create payload', () => {
    const parsed = createIpAccessRuleSchema.safeParse({ ip: '192.0.2.1' })
    expect(parsed.success).toBe(true)
  })

  it('rejects invalid IP', () => {
    const parsed = createIpAccessRuleSchema.safeParse({ ip: 'not-an-ip' })
    expect(parsed.success).toBe(false)
  })

  it('requires rule id for delete', () => {
    expect(deleteIpAccessRuleSchema.safeParse({ ruleId: 'abc' }).success).toBe(true)
    expect(deleteIpAccessRuleSchema.safeParse({}).success).toBe(false)
  })
})

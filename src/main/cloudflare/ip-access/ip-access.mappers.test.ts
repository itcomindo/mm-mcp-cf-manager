import { describe, expect, it } from 'vitest'
import { normalizeIpAccessRule } from './ip-access.mappers'

describe('normalizeIpAccessRule', () => {
  it('maps Cloudflare access rule payload', () => {
    const rule = normalizeIpAccessRule({
      id: 'rule1',
      mode: 'whitelist',
      configuration: { target: 'ip', value: '198.51.100.4' },
      notes: 'office',
      created_on: '2026-01-01T00:00:00Z',
      modified_on: '2026-01-02T00:00:00Z',
      scope: { type: 'account' },
    })
    expect(rule).toEqual({
      id: 'rule1',
      mode: 'whitelist',
      configurationTarget: 'ip',
      configurationValue: '198.51.100.4',
      notes: 'office',
      createdOn: '2026-01-01T00:00:00Z',
      modifiedOn: '2026-01-02T00:00:00Z',
      scopeType: 'account',
    })
  })
})

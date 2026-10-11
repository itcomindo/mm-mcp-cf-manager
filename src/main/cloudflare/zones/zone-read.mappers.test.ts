import { describe, expect, it } from 'vitest'
import { mapDnsRecord, mapOverviewPayload, mapWafRule } from './zone-read.mappers'

describe('mapOverviewPayload', () => {
  it('maps zone fields and cached metadata', () => {
    const overview = mapOverviewPayload({
      zone: {
        id: 'zone-1',
        name: 'example.com',
        status: 'active',
        account: { id: 'acc-1' },
        plan: { name: 'Free Website' },
      },
      developmentMode: false,
      securityLevel: 'medium',
      underAttackMode: false,
      sslMode: 'full',
      cached: {
        lastSyncedAt: '2026-01-01T00:00:00Z',
        detailRefreshedAt: '2026-01-02T00:00:00Z',
        capabilities: { dnsRead: 'available' },
      },
    })

    expect(overview.zoneId).toBe('zone-1')
    expect(overview.domain).toBe('example.com')
    expect(overview.planName).toBe('Free Website')
    expect(overview.capabilities?.dnsRead).toBe('available')
  })
})

describe('mapDnsRecord', () => {
  it('normalizes Cloudflare DNS record shape', () => {
    const record = mapDnsRecord({
      id: 'rec-1',
      type: 'A',
      name: 'www.example.com',
      content: '1.2.3.4',
      proxied: true,
      ttl: 1,
      modified_on: '2026-01-01T00:00:00Z',
    })

    expect(record).toEqual({
      id: 'rec-1',
      type: 'A',
      name: 'www.example.com',
      content: '1.2.3.4',
      proxied: true,
      ttl: 1,
      modifiedOn: '2026-01-01T00:00:00Z',
    })
  })

  it('returns null when required fields missing', () => {
    expect(mapDnsRecord({ id: 'x', type: 'A' })).toBeNull()
  })
})

describe('mapWafRule', () => {
  it('maps custom rule fields', () => {
    const rule = mapWafRule({
      id: 'rule-1',
      description: 'Block bots',
      expression: 'cf.bot_management.score gt 30',
      action: 'block',
      enabled: true,
    })

    expect(rule).toEqual({
      id: 'rule-1',
      description: 'Block bots',
      expression: 'cf.bot_management.score gt 30',
      action: 'block',
      enabled: true,
    })
  })

  it('returns null without id', () => {
    expect(mapWafRule({ description: 'x' })).toBeNull()
  })
})

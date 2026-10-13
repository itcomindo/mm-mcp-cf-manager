import { describe, expect, it } from 'vitest'
import {
  mergeZoneReadCachePayload,
  parseZoneCachePurgeState,
  parseZoneDetailRefreshedAt,
  parseZoneReadCacheJson,
} from './zone-read-cache'

describe('parseZoneReadCacheJson', () => {
  it('returns empty object for null', () => {
    expect(parseZoneReadCacheJson(null)).toEqual({})
  })
})

describe('parseZoneCachePurgeState', () => {
  it('reads cachePurge from capabilities_json payload', () => {
    const json = JSON.stringify({
      capabilities: { cachePurge: 'available' },
    })
    expect(parseZoneCachePurgeState(json)).toBe('available')
  })

  it('returns undefined when missing', () => {
    expect(parseZoneCachePurgeState(null)).toBeUndefined()
    expect(parseZoneCachePurgeState(JSON.stringify({ capabilities: {} }))).toBeUndefined()
  })
})

describe('parseZoneDetailRefreshedAt', () => {
  it('reads detailRefreshedAt from capabilities_json payload', () => {
    const json = JSON.stringify({
      detailRefreshedAt: '2026-03-01T12:00:00.000Z',
      capabilities: { dnsRead: 'available' },
    })
    expect(parseZoneDetailRefreshedAt(json)).toBe('2026-03-01T12:00:00.000Z')
  })

  it('returns null when missing', () => {
    expect(parseZoneDetailRefreshedAt(null)).toBeNull()
    expect(parseZoneDetailRefreshedAt(JSON.stringify({ capabilities: {} }))).toBeNull()
  })
})

describe('mergeZoneReadCachePayload', () => {
  it('preserves snapshot when update omits snapshot', () => {
    const merged = mergeZoneReadCachePayload(
      {
        snapshot: { developmentMode: true, underAttackMode: false },
        capabilities: { devModeRead: 'available' },
      },
      {
        detailRefreshedAt: '2026-01-02T00:00:00Z',
        capabilities: { dnsRead: 'available' },
      },
    )
    expect(merged.snapshot).toEqual({ developmentMode: true, underAttackMode: false })
    expect(merged.capabilities).toEqual({
      devModeRead: 'available',
      dnsRead: 'available',
    })
  })

  it('merges partial snapshot patches', () => {
    const merged = mergeZoneReadCachePayload(
      { snapshot: { developmentMode: true } },
      {
        detailRefreshedAt: '2026-01-02T00:00:00Z',
        snapshot: { underAttackMode: true },
      },
    )
    expect(merged.snapshot).toEqual({ developmentMode: true, underAttackMode: true })
  })

  it('replaces overlapping snapshot fields', () => {
    const merged = mergeZoneReadCachePayload(
      { snapshot: { developmentMode: true } },
      {
        detailRefreshedAt: '2026-01-02T00:00:00Z',
        snapshot: { developmentMode: false },
      },
    )
    expect(merged.snapshot.developmentMode).toBe(false)
  })
})

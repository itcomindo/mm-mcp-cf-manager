import { describe, expect, it } from 'vitest'
import {
  countFreePlanZones,
  mergeZonePages,
  normalizeCloudflareZoneRecord,
  shouldFetchAnotherZoneListPage,
} from './zone-pagination'

describe('mergeZonePages', () => {
  it('merges pages and deduplicates by zone id', () => {
    const merged = mergeZonePages([
      { result: [{ id: 'z1', name: 'one.test' }] },
      { result: [{ id: 'z1', name: 'one.test' }, { id: 'z2', name: 'two.test' }] },
    ])
    expect(merged).toHaveLength(2)
    expect(merged.map((z) => z.id)).toEqual(['z1', 'z2'])
  })
})

describe('normalizeCloudflareZoneRecord', () => {
  it('maps id and name aliases', () => {
    expect(normalizeCloudflareZoneRecord({ zone_id: 'z1', domain: 'a.test' })).toEqual({
      id: 'z1',
      name: 'a.test',
      status: undefined,
      account: undefined,
      plan: undefined,
    })
  })
})

describe('shouldFetchAnotherZoneListPage', () => {
  it('uses total_pages when total_count is absent', () => {
    expect(shouldFetchAnotherZoneListPage(1, 50, 50, { total_pages: 2 })).toBe(true)
    expect(shouldFetchAnotherZoneListPage(2, 11, 61, { total_pages: 2 })).toBe(false)
  })

  it('ignores total_pages when total_count still unmet', () => {
    expect(
      shouldFetchAnotherZoneListPage(1, 30, 30, { total_count: 61, total_pages: 1 }),
    ).toBe(true)
  })

  it('uses total_count when MCP returns partial pages', () => {
    expect(
      shouldFetchAnotherZoneListPage(1, 30, 30, { total_count: 61, total_pages: 2 }),
    ).toBe(true)
    expect(
      shouldFetchAnotherZoneListPage(2, 31, 61, { total_count: 61, total_pages: 2 }),
    ).toBe(false)
  })

  it('continues when batch is partial and totals are unknown', () => {
    expect(shouldFetchAnotherZoneListPage(1, 30, 30, undefined)).toBe(true)
  })

  it('stops on empty batch', () => {
    expect(shouldFetchAnotherZoneListPage(3, 0, 61, { total_count: 61 })).toBe(false)
  })
})

describe('countFreePlanZones', () => {
  it('counts plans containing free', () => {
    const count = countFreePlanZones([
      { id: '1', plan: { name: 'Free Website' } },
      { id: '2', plan: { name: 'Pro' } },
      { id: '3', plan: { name: 'free' } },
    ])
    expect(count).toBe(2)
  })
})

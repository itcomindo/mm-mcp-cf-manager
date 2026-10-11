import { describe, expect, it } from 'vitest'
import { parseZoneSnapshotFlags } from './zone-snapshot-flags'

describe('parseZoneSnapshotFlags', () => {
  it('returns null flags when json is missing', () => {
    expect(parseZoneSnapshotFlags(null)).toEqual({
      developmentMode: null,
      underAttackMode: null,
    })
  })

  it('reads snapshot booleans', () => {
    const json = JSON.stringify({
      snapshot: { developmentMode: true, underAttackMode: false },
    })
    expect(parseZoneSnapshotFlags(json)).toEqual({
      developmentMode: true,
      underAttackMode: false,
    })
  })

  it('returns null flags for invalid json', () => {
    expect(parseZoneSnapshotFlags('{not json')).toEqual({
      developmentMode: null,
      underAttackMode: null,
    })
  })
})

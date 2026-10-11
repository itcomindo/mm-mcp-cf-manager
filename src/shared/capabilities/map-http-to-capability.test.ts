import { describe, expect, it } from 'vitest'
import { capabilityFromProbe } from './map-http-to-capability'

describe('capabilityFromProbe', () => {
  it('returns available on success', () => {
    expect(capabilityFromProbe(true)).toBe('available')
  })

  it('maps 403 and 401 to permission_missing', () => {
    expect(capabilityFromProbe(false, 403)).toBe('permission_missing')
    expect(capabilityFromProbe(false, 401)).toBe('permission_missing')
  })

  it('maps 402 and 400 to plan_restricted', () => {
    expect(capabilityFromProbe(false, 402)).toBe('plan_restricted')
    expect(capabilityFromProbe(false, 400)).toBe('plan_restricted')
  })

  it('returns unavailable for other failures', () => {
    expect(capabilityFromProbe(false, 429)).toBe('unavailable')
    expect(capabilityFromProbe(false)).toBe('unavailable')
  })
})

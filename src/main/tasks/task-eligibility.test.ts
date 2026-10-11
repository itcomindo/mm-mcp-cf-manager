import { describe, expect, it } from 'vitest'
import { eligibilityFromCapability } from './task-eligibility'

describe('eligibilityFromCapability', () => {
  it('maps capability states to bulk eligibility', () => {
    expect(eligibilityFromCapability('available')).toBe('eligible')
    expect(eligibilityFromCapability('permission_missing')).toBe('permission_missing')
    expect(eligibilityFromCapability('plan_restricted')).toBe('plan_restricted')
    expect(eligibilityFromCapability(undefined)).toBe('unknown')
  })
})

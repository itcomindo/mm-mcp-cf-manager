import type { CapabilityState } from '../schemas/capabilities.schema'

export function capabilityFromProbe(success: boolean, status?: number): CapabilityState {
  if (success) return 'available'
  if (status === 403) return 'permission_missing'
  if (status === 402 || status === 400) return 'plan_restricted'
  if (status === 401) return 'permission_missing'
  return 'unavailable'
}

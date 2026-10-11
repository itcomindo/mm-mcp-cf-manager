import { isCapabilityWritable } from '@shared/capabilities/is-writable'
import type { CapabilityState } from '@shared/schemas/capabilities.schema'
import type { z } from 'zod'
import type { zoneEligibilitySchema } from '@shared/schemas/tasks.schema'

export type ZoneEligibility = z.infer<typeof zoneEligibilitySchema>

export function eligibilityFromCapability(state: CapabilityState | undefined): ZoneEligibility {
  if (isCapabilityWritable(state)) return 'eligible'
  if (state === 'permission_missing') return 'permission_missing'
  if (state === 'plan_restricted') return 'plan_restricted'
  if (state === 'unavailable') return 'unavailable'
  return 'unknown'
}

export function eligibilityFromZoneCached(zoneExists: boolean): ZoneEligibility {
  return zoneExists ? 'eligible' : 'unknown'
}

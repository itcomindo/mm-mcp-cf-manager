import type { CapabilityState } from '../schemas/capabilities.schema'

export function isCapabilityWritable(state: CapabilityState | undefined): boolean {
  return state === 'available'
}

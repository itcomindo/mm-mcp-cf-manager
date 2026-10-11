import { isCapabilityWritable } from '@shared/capabilities/is-writable'
import type { CapabilityState } from '@shared/schemas/capabilities.schema'
import { strings } from '@renderer/strings/en'

export function writeDisabledReason(state: CapabilityState | undefined): string | null {
  if (isCapabilityWritable(state)) return null
  if (!state || state === 'unknown' || state === 'loading') {
    return strings.write.notAvailableRefresh
  }
  return strings.write.notAvailableState(strings.capabilities.stateLabel(state))
}

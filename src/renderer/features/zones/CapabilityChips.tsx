import type { JSX } from 'react'
import type { CapabilityKey, ZoneCapabilities } from '@shared/schemas/capabilities.schema'
import { strings } from '@renderer/strings/en'

const ORDER: CapabilityKey[] = [
  'dnsRead',
  'dnsWrite',
  'cachePurge',
  'devModeRead',
  'securityRead',
  'wafRead',
]

type CapabilityChipsProps = {
  capabilities?: ZoneCapabilities
}

export function CapabilityChips({ capabilities }: CapabilityChipsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {ORDER.map((key) => {
        const state = capabilities?.[key] ?? 'unknown'
        return (
          <span
            key={key}
            title={strings.capabilities.stateLabel(state)}
            className="rounded-md border border-border bg-surface px-2 py-0.5 text-[0.85em]"
          >
            {strings.capabilities.keyLabel(key)}: {strings.capabilities.stateLabel(state)}
          </span>
        )
      })}
    </div>
  )
}

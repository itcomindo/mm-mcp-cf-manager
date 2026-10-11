import type { JSX } from 'react'
import { strings } from '@renderer/strings/en'

type ZoneStatusBadgesProps = {
  developmentMode: boolean | null
  underAttackMode: boolean | null
}

export function ZoneStatusBadges({
  developmentMode,
  underAttackMode,
}: ZoneStatusBadgesProps): JSX.Element | null {
  const showDev = developmentMode === true
  const showUam = underAttackMode === true
  if (!showDev && !showUam) {
    return null
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {showDev ? (
        <span
          className="rounded px-1 py-0.5 text-[0.65em] font-semibold uppercase tracking-wide text-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_18%,transparent)]"
          title={strings.sidebar.devModeBadgeTitle}
          aria-label={strings.sidebar.devModeBadgeTitle}
        >
          {strings.sidebar.devModeBadge}
        </span>
      ) : null}
      {showUam ? (
        <span
          className="rounded px-1 py-0.5 text-[0.65em] font-semibold uppercase tracking-wide text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_18%,transparent)]"
          title={strings.sidebar.underAttackBadgeTitle}
          aria-label={strings.sidebar.underAttackBadgeTitle}
        >
          {strings.sidebar.underAttackBadge}
        </span>
      ) : null}
    </span>
  )
}

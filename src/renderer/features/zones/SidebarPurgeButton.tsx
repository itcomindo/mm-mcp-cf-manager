import type { JSX, MouseEvent } from 'react'
import type { CapabilityState } from '@shared/schemas/capabilities.schema'
import { strings } from '@renderer/strings/en'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'
import { usePurgeEverything } from './use-purge-everything'

type SidebarPurgeButtonProps = {
  zoneId: string
  domain: string
  cachePurge: CapabilityState | undefined
  onPurgeComplete?: () => void
  className?: string
}

export function SidebarPurgeButton({
  zoneId,
  domain,
  cachePurge,
  onPurgeComplete,
  className = '',
}: SidebarPurgeButtonProps): JSX.Element {
  const purge = usePurgeEverything({ zoneId, cachePurge, onComplete: onPurgeComplete })

  const onClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
    purge.openConfirmOrRun()
  }

  const title =
    purge.lastError ??
    purge.lastNotice ??
    purge.disabledReason ??
    strings.sidebar.purgeButtonTitle(domain)

  return (
    <>
      <button
        type="button"
        disabled={Boolean(purge.disabledReason) || purge.loading}
        title={title}
        aria-label={strings.sidebar.purgeButtonTitle(domain)}
        onClick={onClick}
        className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded px-1 py-0.5 text-[0.65em] font-semibold leading-none text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ring-focus ${className}`}
      >
        {purge.loading ? '…' : strings.sidebar.purgeButton}
      </button>
      <ConfirmDialog
        open={purge.confirmOpen}
        title={strings.write.purgeConfirmTitle}
        message={strings.write.purgeConfirmMessage(domain)}
        confirmLabel={strings.write.purgeEverything}
        cancelLabel={strings.write.cancel}
        destructive
        loading={purge.loading}
        onCancel={purge.closeConfirm}
        onConfirm={purge.confirmAndRun}
      />
    </>
  )
}

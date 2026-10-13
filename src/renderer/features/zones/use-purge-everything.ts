import { useCallback, useState } from 'react'
import type { CapabilityState } from '@shared/schemas/capabilities.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { writeDisabledReason } from '@renderer/lib/capability-ui'
import { useSettingsStore } from '@renderer/stores/settings-store'

type UsePurgeEverythingOptions = {
  zoneId: string
  cachePurge: CapabilityState | undefined
  onComplete?: () => void
}

type UsePurgeEverythingResult = {
  disabledReason: string | null
  loading: boolean
  confirmOpen: boolean
  openConfirmOrRun: () => void
  closeConfirm: () => void
  confirmAndRun: () => void
  lastNotice: string | null
  lastError: string | null
  clearFeedback: () => void
}

export function usePurgeEverything({
  zoneId,
  cachePurge,
  onComplete,
}: UsePurgeEverythingOptions): UsePurgeEverythingResult {
  const confirmHighImpact = useSettingsStore(
    (s) => s.settings?.behavior.confirmSingleHighImpact ?? true,
  )

  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [lastNotice, setLastNotice] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const disabledReason = writeDisabledReason(cachePurge)

  const runPurge = useCallback((): void => {
    void (async () => {
      setLoading(true)
      setLastNotice(null)
      setLastError(null)
      try {
        const result = unwrapIpc(await window.mmcf.cache.purgeEverything(zoneId))
        setLastNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setConfirmOpen(false)
        onComplete?.()
      } catch (err) {
        setLastError(err instanceof Error ? err.message : strings.write.actionFailed)
      } finally {
        setLoading(false)
      }
    })()
  }, [zoneId, onComplete])

  const openConfirmOrRun = useCallback((): void => {
    if (disabledReason || loading) return
    if (confirmHighImpact) {
      setConfirmOpen(true)
      return
    }
    runPurge()
  }, [confirmHighImpact, disabledReason, loading, runPurge])

  return {
    disabledReason,
    loading,
    confirmOpen,
    openConfirmOrRun,
    closeConfirm: () => setConfirmOpen(false),
    confirmAndRun: runPurge,
    lastNotice,
    lastError,
    clearFeedback: () => {
      setLastNotice(null)
      setLastError(null)
    },
  }
}

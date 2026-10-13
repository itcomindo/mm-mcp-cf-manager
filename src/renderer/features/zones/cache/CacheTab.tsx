import { useCallback, useEffect, useState, type JSX } from 'react'
import type { CacheStatus } from '@shared/schemas/zone-read.schema'
import type { ZoneOverview } from '@shared/schemas/zone-read.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { writeDisabledReason } from '@renderer/lib/capability-ui'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { usePurgeEverything } from '@renderer/features/zones/use-purge-everything'
import { Button } from '@renderer/components/ui/Button'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'

type CacheTabProps = {
  zoneId: string
  domain: string
  refreshToken: number
  onZoneMutated?: () => void
}

export function CacheTab({
  zoneId,
  domain,
  refreshToken,
  onZoneMutated,
}: CacheTabProps): JSX.Element {
  const dryRun = useSettingsStore((s) => s.settings?.behavior.dryRun ?? false)

  const [status, setStatus] = useState<CacheStatus | null>(null)
  const [overview, setOverview] = useState<ZoneOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<'dev' | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [cacheStatus, zoneOverview] = await Promise.all([
        window.mmcf.cache.getStatus(zoneId),
        window.mmcf.zones.getOverview(zoneId),
      ])
      setStatus(unwrapIpc(cacheStatus))
      setOverview(unwrapIpc(zoneOverview))
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.zoneTabs.loadFailed)
    }
  }, [zoneId])

  useEffect(() => {
    void load()
  }, [zoneId, refreshToken, load])

  const onPurgeComplete = useCallback((): void => {
    onZoneMutated?.()
    void load()
  }, [load, onZoneMutated])

  const purge = usePurgeEverything({
    zoneId,
    cachePurge: overview?.capabilities?.cachePurge,
    onComplete: onPurgeComplete,
  })

  useEffect(() => {
    if (purge.lastNotice) setNotice(purge.lastNotice)
  }, [purge.lastNotice])

  useEffect(() => {
    if (purge.lastError) setError(purge.lastError)
  }, [purge.lastError])

  const devReason = writeDisabledReason(overview?.capabilities?.devModeWrite)
  const purgeBusy = purge.loading

  const toggleDevMode = (enabled: boolean): void => {
    void (async () => {
      setBusy('dev')
      setNotice(null)
      setError(null)
      try {
        const result = unwrapIpc(
          await window.mmcf.cache.setDevelopmentMode({ zoneId, enabled }),
        )
        setNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        onZoneMutated?.()
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.write.actionFailed)
      } finally {
        setBusy(null)
      }
    })()
  }

  if (!status && !error) {
    return <p className="text-muted-foreground">{strings.zoneTabs.loading}</p>
  }

  return (
    <div className="space-y-4">
      {dryRun ? (
        <p className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-[0.85em] text-muted-foreground">
          {strings.write.dryRunNotice}
        </p>
      ) : null}
      {notice ? <p className="text-[0.9em] text-[var(--success)]">{notice}</p> : null}
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      <dl className="grid max-w-lg gap-2 text-[0.9em]">
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.devMode}</dt>
          <dd>
            {status?.developmentMode === null
              ? '—'
              : status?.developmentMode
                ? strings.common.on
                : strings.common.off}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.readState}</dt>
          <dd>{strings.capabilities.stateLabel(status?.readState ?? 'unknown')}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={Boolean(purge.disabledReason) || purgeBusy || busy !== null}
          loading={purgeBusy}
          title={purge.disabledReason ?? undefined}
          onClick={purge.openConfirmOrRun}
        >
          {strings.write.purgeEverything}
        </Button>
        <Button
          disabled={Boolean(devReason) || busy !== null || purgeBusy || status?.developmentMode === true}
          loading={busy === 'dev'}
          title={devReason ?? undefined}
          onClick={() => toggleDevMode(true)}
        >
          {strings.write.devModeOn}
        </Button>
        <Button
          disabled={Boolean(devReason) || busy !== null || purgeBusy || status?.developmentMode === false}
          loading={busy === 'dev'}
          title={devReason ?? undefined}
          onClick={() => toggleDevMode(false)}
        >
          {strings.write.devModeOff}
        </Button>
      </div>
      <ConfirmDialog
        open={purge.confirmOpen}
        title={strings.write.purgeConfirmTitle}
        message={strings.write.purgeConfirmMessage(domain)}
        confirmLabel={strings.write.purgeEverything}
        cancelLabel={strings.write.cancel}
        destructive
        loading={purgeBusy}
        onCancel={purge.closeConfirm}
        onConfirm={purge.confirmAndRun}
      />
    </div>
  )
}

import { useCallback, useEffect, useState, type JSX } from 'react'
import type { CacheStatus } from '@shared/schemas/zone-read.schema'
import type { ZoneOverview } from '@shared/schemas/zone-read.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { writeDisabledReason } from '@renderer/lib/capability-ui'
import { useSettingsStore } from '@renderer/stores/settings-store'
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
  const confirmHighImpact = useSettingsStore(
    (s) => s.settings?.behavior.confirmSingleHighImpact ?? true,
  )
  const dryRun = useSettingsStore((s) => s.settings?.behavior.dryRun ?? false)

  const [status, setStatus] = useState<CacheStatus | null>(null)
  const [overview, setOverview] = useState<ZoneOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [busy, setBusy] = useState<'purge' | 'dev' | null>(null)

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

  const purgeReason = writeDisabledReason(overview?.capabilities?.cachePurge)
  const devReason = writeDisabledReason(overview?.capabilities?.devModeWrite)

  const runPurge = (): void => {
    void (async () => {
      setBusy('purge')
      setNotice(null)
      setError(null)
      try {
        const result = unwrapIpc(await window.mmcf.cache.purgeEverything(zoneId))
        setNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setPurgeOpen(false)
        onZoneMutated?.()
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.write.actionFailed)
      } finally {
        setBusy(null)
      }
    })()
  }

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
          disabled={Boolean(purgeReason) || busy !== null}
          loading={busy === 'purge'}
          title={purgeReason ?? undefined}
          onClick={() => {
            if (confirmHighImpact) setPurgeOpen(true)
            else runPurge()
          }}
        >
          {strings.write.purgeEverything}
        </Button>
        <Button
          disabled={Boolean(devReason) || busy !== null || status?.developmentMode === true}
          loading={busy === 'dev'}
          title={devReason ?? undefined}
          onClick={() => toggleDevMode(true)}
        >
          {strings.write.devModeOn}
        </Button>
        <Button
          disabled={Boolean(devReason) || busy !== null || status?.developmentMode === false}
          loading={busy === 'dev'}
          title={devReason ?? undefined}
          onClick={() => toggleDevMode(false)}
        >
          {strings.write.devModeOff}
        </Button>
      </div>
      <ConfirmDialog
        open={purgeOpen}
        title={strings.write.purgeConfirmTitle}
        message={strings.write.purgeConfirmMessage(domain)}
        confirmLabel={strings.write.purgeEverything}
        cancelLabel={strings.write.cancel}
        destructive
        loading={busy === 'purge'}
        onCancel={() => setPurgeOpen(false)}
        onConfirm={runPurge}
      />
    </div>
  )
}

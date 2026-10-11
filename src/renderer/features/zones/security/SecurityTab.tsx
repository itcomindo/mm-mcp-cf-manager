import { useCallback, useEffect, useState, type JSX } from 'react'
import type { SecurityStatus, ZoneOverview } from '@shared/schemas/zone-read.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { writeDisabledReason } from '@renderer/lib/capability-ui'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { Button } from '@renderer/components/ui/Button'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'

type SecurityTabProps = {
  zoneId: string
  domain: string
  refreshToken: number
  onZoneMutated?: () => void
}

export function SecurityTab({
  zoneId,
  domain,
  refreshToken,
  onZoneMutated,
}: SecurityTabProps): JSX.Element {
  const confirmHighImpact = useSettingsStore(
    (s) => s.settings?.behavior.confirmSingleHighImpact ?? true,
  )
  const dryRun = useSettingsStore((s) => s.settings?.behavior.dryRun ?? false)

  const [status, setStatus] = useState<SecurityStatus | null>(null)
  const [overview, setOverview] = useState<ZoneOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmEnable, setConfirmEnable] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [sec, ov] = await Promise.all([
        window.mmcf.security.getStatus(zoneId),
        window.mmcf.zones.getOverview(zoneId),
      ])
      setStatus(unwrapIpc(sec))
      setOverview(unwrapIpc(ov))
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.zoneTabs.loadFailed)
    }
  }, [zoneId])

  useEffect(() => {
    void load()
  }, [zoneId, refreshToken, load])

  const writeReason = writeDisabledReason(overview?.capabilities?.securityWrite)

  const applyUnderAttack = (enabled: boolean): void => {
    void (async () => {
      setBusy(true)
      setNotice(null)
      setError(null)
      try {
        const restoreLevel =
          !enabled && status?.securityLevel && status.securityLevel !== 'under_attack'
            ? status.securityLevel
            : 'medium'
        const result = unwrapIpc(
          await window.mmcf.security.setUnderAttackMode({
            zoneId,
            enabled,
            restoreLevel: enabled ? undefined : restoreLevel,
          }),
        )
        setNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setConfirmEnable(false)
        onZoneMutated?.()
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.write.actionFailed)
      } finally {
        setBusy(false)
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
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.securityLevel}</dt>
          <dd>{status?.securityLevel ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.underAttack}</dt>
          <dd>
            {status?.underAttackMode === null
              ? '—'
              : status?.underAttackMode
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
          disabled={Boolean(writeReason) || busy || status?.underAttackMode === true}
          loading={busy}
          title={writeReason ?? undefined}
          onClick={() => {
            if (confirmHighImpact) setConfirmEnable(true)
            else applyUnderAttack(true)
          }}
        >
          {strings.write.underAttackOn}
        </Button>
        <Button
          disabled={Boolean(writeReason) || busy || status?.underAttackMode === false}
          loading={busy}
          title={writeReason ?? undefined}
          onClick={() => applyUnderAttack(false)}
        >
          {strings.write.underAttackOff}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmEnable}
        title={strings.write.underAttackConfirmTitle}
        message={strings.write.underAttackEnableMessage(domain)}
        confirmLabel={strings.write.underAttackOn}
        cancelLabel={strings.write.cancel}
        loading={busy}
        onCancel={() => setConfirmEnable(false)}
        onConfirm={() => applyUnderAttack(true)}
      />
    </div>
  )
}

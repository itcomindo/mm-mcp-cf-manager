import { useCallback, useEffect, useState, type JSX } from 'react'
import type { ZoneOverview } from '@shared/schemas/zone-read.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { Button } from '@renderer/components/ui/Button'
import { CapabilityChips } from '../CapabilityChips'

type OverviewTabProps = {
  zoneId: string
  refreshToken: number
}

export function OverviewTab({ zoneId, refreshToken }: OverviewTabProps): JSX.Element {
  const [overview, setOverview] = useState<ZoneOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (live: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const data = live
        ? unwrapIpc(await window.mmcf.zones.refresh(zoneId))
        : unwrapIpc(await window.mmcf.zones.getOverview(zoneId))
      setOverview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.zoneTabs.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [zoneId])

  useEffect(() => {
    void load(refreshToken > 0)
  }, [zoneId, refreshToken, load])

  if (loading && !overview) {
    return <p className="text-muted-foreground">{strings.zoneTabs.loading}</p>
  }

  if (error && !overview) {
    return <p className="text-[var(--danger)]">{error}</p>
  }

  if (!overview) {
    return <p className="text-muted-foreground">{strings.zoneTabs.noData}</p>
  }

  const copy = (value: string): void => {
    void navigator.clipboard.writeText(value)
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-[0.9em] text-[var(--danger)]">{error}</p> : null}
      <dl className="grid grid-cols-1 gap-2 text-[0.9em] md:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.domain}</dt>
          <dd>{overview.domain}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.status}</dt>
          <dd>{overview.status ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.plan}</dt>
          <dd>{overview.planName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.devMode}</dt>
          <dd>
            {overview.developmentMode === null
              ? '—'
              : overview.developmentMode
                ? strings.common.on
                : strings.common.off}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.securityLevel}</dt>
          <dd>{overview.securityLevel ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.underAttack}</dt>
          <dd>
            {overview.underAttackMode === null
              ? '—'
              : overview.underAttackMode
                ? strings.common.on
                : strings.common.off}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.ssl}</dt>
          <dd>{overview.sslMode ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.lastSync}</dt>
          <dd>{overview.lastSyncedAt ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{strings.zoneTabs.fields.detailRefreshed}</dt>
          <dd>{overview.detailRefreshedAt ?? '—'}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => copy(overview.zoneId)}>
          {strings.zoneTabs.copyZoneId}
        </Button>
        {overview.accountId ? (
          <Button size="sm" variant="ghost" onClick={() => copy(overview.accountId!)}>
            {strings.zoneTabs.copyAccountId}
          </Button>
        ) : null}
        <Button
          size="sm"
          loading={loading}
          title={strings.buttons.refreshZoneTitle}
          onClick={() => void load(true)}
        >
          {strings.buttons.refreshZone}
        </Button>
      </div>
      <div>
        <p className="mb-2 font-medium">{strings.zoneTabs.capabilitiesTitle}</p>
        <CapabilityChips capabilities={overview.capabilities} />
      </div>
    </div>
  )
}

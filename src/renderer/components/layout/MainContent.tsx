import { useState, type JSX } from 'react'
import { strings } from '@renderer/strings/en'
import { useUiStore, type MainTab } from '@renderer/stores/ui-store'
import { useZonesStore } from '@renderer/stores/zones-store'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { AdminDataTab } from '@renderer/features/admin-data/AdminDataTab'
import { ActivityTab } from '@renderer/features/zones/activity/ActivityTab'
import { CacheTab } from '@renderer/features/zones/cache/CacheTab'
import { DnsTab } from '@renderer/features/zones/dns/DnsTab'
import { OverviewTab } from '@renderer/features/zones/overview/OverviewTab'
import { SecurityTab } from '@renderer/features/zones/security/SecurityTab'
import { WafTab } from '@renderer/features/zones/waf/WafTab'
import { ZoneStatusBadges } from '../zones/ZoneStatusBadges'
import { formatTimestamp } from '@renderer/lib/format-timestamp'
import { Button } from '../ui/Button'

const tabs: MainTab[] = [
  'overview',
  'dns',
  'cache',
  'security',
  'waf',
  'activity',
  'adminData',
]

export function MainContent(): JSX.Element {
  const activeTab = useUiStore((s) => s.activeTab)
  const setActiveTab = useUiStore((s) => s.setActiveTab)
  const openedZoneId = useUiStore((s) => s.openedZoneId)
  const zones = useZonesStore((s) => s.zones)
  const opened = zones.find((zone) => zone.zoneId === openedZoneId)

  const [refreshToken, setRefreshToken] = useState(0)
  const [activityToken, setActivityToken] = useState(0)

  const hydrateZones = useZonesStore((s) => s.hydrate)

  const onZoneMutated = (): void => {
    setRefreshToken((value) => value + 1)
    setActivityToken((value) => value + 1)
    void hydrateZones()
  }
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const onRefreshZone = (): void => {
    if (!openedZoneId) return
    void (async () => {
      setRefreshing(true)
      setRefreshError(null)
      try {
        unwrapIpc(await window.mmcf.zones.refresh(openedZoneId))
        setRefreshToken((value) => value + 1)
        await hydrateZones()
      } catch (error) {
        setRefreshError(error instanceof Error ? error.message : strings.zoneTabs.loadFailed)
      } finally {
        setRefreshing(false)
      }
    })()
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-[0.9em] text-muted-foreground">
              {opened ? strings.main.openedDomain(opened.domain) : strings.main.selectDomain}
            </p>
            {opened ? (
              <ZoneStatusBadges
                developmentMode={opened.developmentMode}
                underAttackMode={opened.underAttackMode}
              />
            ) : null}
          </div>
          {opened ? (
            <p className="mt-0.5 text-[0.8em] text-muted-foreground">
              {opened.detailRefreshedAt
                ? strings.main.lastDetailRefresh(formatTimestamp(opened.detailRefreshedAt))
                : strings.main.neverDetailRefreshed}
            </p>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!openedZoneId}
          loading={refreshing}
          title={strings.buttons.refreshZoneTitle}
          onClick={onRefreshZone}
        >
          {strings.buttons.refreshZone}
        </Button>
      </div>
      {refreshError ? (
        <p className="border-b border-border bg-surface-elevated px-4 py-2 text-[0.9em] text-[var(--danger)]">
          {refreshError}
        </p>
      ) : null}
      <nav className="flex gap-1 border-b border-border px-3 py-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? 'primary' : 'ghost'}
            onClick={() => setActiveTab(tab)}
            disabled={!openedZoneId && tab !== 'adminData'}
          >
            {strings.tabs[tab]}
          </Button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!openedZoneId && activeTab !== 'adminData' ? (
          <p className="text-muted-foreground">{strings.main.selectDomain}</p>
        ) : null}
        {activeTab === 'adminData' ? (
          <AdminDataTab zoneId={openedZoneId} domain={opened?.domain ?? null} />
        ) : null}
        {openedZoneId && activeTab === 'overview' ? (
          <OverviewTab zoneId={openedZoneId} refreshToken={refreshToken} />
        ) : null}
        {openedZoneId && activeTab === 'dns' ? (
          <DnsTab zoneId={openedZoneId} onZoneMutated={onZoneMutated} />
        ) : null}
        {openedZoneId && activeTab === 'cache' ? (
          <CacheTab
            zoneId={openedZoneId}
            domain={opened?.domain ?? openedZoneId}
            refreshToken={refreshToken}
            onZoneMutated={onZoneMutated}
          />
        ) : null}
        {openedZoneId && activeTab === 'security' ? (
          <SecurityTab
            zoneId={openedZoneId}
            domain={opened?.domain ?? openedZoneId}
            refreshToken={refreshToken}
            onZoneMutated={onZoneMutated}
          />
        ) : null}
        {openedZoneId && activeTab === 'waf' ? (
          <WafTab zoneId={openedZoneId} onZoneMutated={onZoneMutated} />
        ) : null}
        {openedZoneId && activeTab === 'activity' ? (
          <ActivityTab zoneId={openedZoneId} refreshToken={activityToken} />
        ) : null}
      </div>
    </section>
  )
}

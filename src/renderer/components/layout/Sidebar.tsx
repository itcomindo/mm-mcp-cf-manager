import { useMemo, useState, type JSX } from 'react'
import type { BulkActionKind } from '@shared/schemas/tasks.schema'
import { strings } from '@renderer/strings/en'
import { formatTimestamp } from '@renderer/lib/format-timestamp'
import { useUiStore } from '@renderer/stores/ui-store'
import { useZonesStore } from '@renderer/stores/zones-store'
import { BulkActionsBar } from '@renderer/features/bulk/BulkActionsBar'
import { DomainAdminPopover } from '@renderer/features/admin-data/DomainAdminPopover'
import { SidebarPurgeButton } from '@renderer/features/zones/SidebarPurgeButton'
import { ZoneStatusBadges } from '../zones/ZoneStatusBadges'
import { Button } from '../ui/Button'

type SidebarProps = {
  onBulkTaskStarted: (taskId: string, action: BulkActionKind) => void
}

function isFreePlan(planName: string | null): boolean {
  return (planName ?? '').toLowerCase().includes('free')
}

export function Sidebar({ onBulkTaskStarted }: SidebarProps): JSX.Element {
  const zones = useZonesStore((s) => s.zones)
  const [search, setSearch] = useState('')
  const openedZoneId = useUiStore((s) => s.openedZoneId)
  const selectedZoneIds = useUiStore((s) => s.selectedZoneIds)
  const setOpenedZone = useUiStore((s) => s.setOpenedZone)
  const toggleZoneSelection = useUiStore((s) => s.toggleZoneSelection)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const hydrateZones = useZonesStore((s) => s.hydrate)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return zones
    return zones.filter((zone) => zone.domain.toLowerCase().includes(query))
  }, [search, zones])

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((zone) => selectedZoneIds.includes(zone.zoneId))

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-surface">
      <div className="space-y-2 border-b border-border p-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={strings.sidebar.searchPlaceholder}
          className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-foreground outline-none focus-visible:ring-2 ring-focus"
        />
        <p className="text-[0.85em] text-muted-foreground">
          {strings.sidebar.domainCount(zones.length)}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={filtered.length === 0}
            onClick={() => {
              if (allVisibleSelected) {
                clearSelection()
                return
              }
              for (const zone of filtered) {
                if (!selectedZoneIds.includes(zone.zoneId)) {
                  toggleZoneSelection(zone.zoneId)
                }
              }
            }}
          >
            {strings.sidebar.selectAllVisible}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={selectedZoneIds.length === 0}
            onClick={clearSelection}
          >
            {strings.sidebar.clearSelection}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="font-medium text-foreground">{strings.sidebar.emptyTitle}</p>
          <p className="text-[0.9em] text-muted-foreground">{strings.sidebar.emptyHint}</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.map((zone) => {
            const isOpened = openedZoneId === zone.zoneId
            const isSelected = selectedZoneIds.includes(zone.zoneId)
            return (
              <li key={zone.zoneId} className="mb-1 min-w-0">
                <div
                  className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 ${
                    isOpened ? 'bg-sidebar-active' : isSelected ? 'bg-sidebar-selected' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleZoneSelection(zone.zoneId)}
                      aria-label={`Select ${zone.domain}`}
                      className="shrink-0 cursor-pointer"
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-0.5">
                      <DomainAdminPopover
                        zoneId={zone.zoneId}
                        domain={zone.domain}
                        detailRefreshedAt={zone.detailRefreshedAt}
                        lastSyncedAt={zone.lastSyncedAt}
                        onOpenZone={() => setOpenedZone(zone.zoneId)}
                      >
                        {zone.domain}
                      </DomainAdminPopover>
                      <SidebarPurgeButton
                        zoneId={zone.zoneId}
                        domain={zone.domain}
                        cachePurge={zone.cachePurge}
                        onPurgeComplete={() => void hydrateZones()}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full border ${
                        zone.detailRefreshedAt
                          ? 'border-[var(--success)] bg-[var(--success)]'
                          : 'border-muted-foreground bg-transparent'
                      }`}
                      title={
                        zone.detailRefreshedAt
                          ? strings.sidebar.detailRefreshedTitle(
                              formatTimestamp(zone.detailRefreshedAt),
                            )
                          : strings.sidebar.notDetailRefreshedTitle
                      }
                      aria-label={strings.sidebar.detailRefreshMarkerTitle}
                    />
                    <ZoneStatusBadges
                      developmentMode={zone.developmentMode}
                      underAttackMode={zone.underAttackMode}
                    />
                    {isFreePlan(zone.planName) ? (
                      <span className="rounded bg-muted px-1 text-[0.7em] font-semibold text-muted-foreground">
                        {strings.sidebar.freeBadge}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {zones.length > 0 ? (
        <p className="border-t border-border px-3 py-2 text-[0.75em] leading-snug text-muted-foreground">
          {strings.sidebar.statusHint}
        </p>
      ) : null}

      <BulkActionsBar onTaskStarted={onBulkTaskStarted} />
    </aside>
  )
}

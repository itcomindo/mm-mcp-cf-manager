import { useState, type JSX } from 'react'
import type { BulkActionKind } from '@shared/schemas/tasks.schema'
import { strings } from '@renderer/strings/en'
import { useUiStore } from '@renderer/stores/ui-store'
import { Button } from '@renderer/components/ui/Button'
import { BulkPreviewModal } from './BulkPreviewModal'

const BULK_ACTIONS: BulkActionKind[] = [
  'zones.refresh_detail',
  'cache.purge_everything',
  'cache.development_mode_on',
  'cache.development_mode_off',
  'security.under_attack_on',
  'security.under_attack_off',
]

type BulkActionsBarProps = {
  onTaskStarted: (taskId: string, action: BulkActionKind) => void
}

export function BulkActionsBar({ onTaskStarted }: BulkActionsBarProps): JSX.Element | null {
  const selectedZoneIds = useUiStore((s) => s.selectedZoneIds)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<BulkActionKind | null>(null)

  if (selectedZoneIds.length === 0) return null

  return (
    <div className="border-t border-border p-3">
      <p className="mb-2 text-[0.85em] text-muted-foreground">
        {strings.bulk.selectedCount(selectedZoneIds.length)}
      </p>
      <div className="relative flex gap-2">
        <Button size="sm" onClick={() => setMenuOpen((value) => !value)}>
          {strings.bulk.actionsMenu}
        </Button>
        <Button size="sm" variant="ghost" onClick={clearSelection}>
          {strings.sidebar.clearSelection}
        </Button>
        {menuOpen ? (
          <ul className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-md border border-border bg-surface-elevated py-1 shadow-lg">
            {BULK_ACTIONS.map((action) => (
              <li key={action}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-[0.9em] hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false)
                    setPendingAction(action)
                  }}
                >
                  {strings.bulk.actionName(action)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <BulkPreviewModal
        open={pendingAction !== null}
        action={pendingAction}
        zoneIds={selectedZoneIds}
        onClose={() => setPendingAction(null)}
        onStarted={(taskId) => {
          if (pendingAction) onTaskStarted(taskId, pendingAction)
        }}
      />
    </div>
  )
}

import { useEffect, type JSX } from 'react'
import { strings } from '@renderer/strings/en'
import { useConnectionStore } from '@renderer/stores/connection-store'
import { useTasksStore } from '@renderer/stores/tasks-store'
import { Button } from '../ui/Button'

type TopBarProps = {
  onOpenSettings: () => void
  onOpenTasks: () => void
}

export function TopBar({ onOpenSettings, onOpenTasks }: TopBarProps): JSX.Element {
  const status = useConnectionStore((s) => s.status)
  const connected = status?.isConnected ?? false
  const activeCount = useTasksStore((s) => s.activeCount)
  const refreshTasks = useTasksStore((s) => s.refresh)

  useEffect(() => {
    void refreshTasks()
    const timer = window.setInterval(() => void refreshTasks(), 5000)
    return () => window.clearInterval(timer)
  }, [refreshTasks])

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[1.05em] font-semibold text-foreground">{strings.appName}</h1>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.85em] ${
            connected
              ? 'bg-[color-mix(in_srgb,var(--success)_20%,transparent)] text-[var(--success)]'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {connected ? strings.connection.connected : strings.connection.disconnected}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onOpenTasks}>
          {strings.topBar.tasks}: {activeCount}
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          {strings.topBar.settings}
        </Button>
      </div>
    </header>
  )
}

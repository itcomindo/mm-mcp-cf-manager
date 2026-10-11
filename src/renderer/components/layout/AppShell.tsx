import { useState, type JSX } from 'react'
import type { BulkActionKind } from '@shared/schemas/tasks.schema'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { useUiStore } from '@renderer/stores/ui-store'
import { useTasksStore } from '@renderer/stores/tasks-store'
import { useZonesStore } from '@renderer/stores/zones-store'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'
import { TasksPanel } from '@renderer/features/tasks/TasksPanel'
import { MainContent } from './MainContent'
import { ResizableSidebarLayout } from './ResizableSidebarLayout'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell(): JSX.Element {
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)
  const [tasksOpen, setTasksOpen] = useState(false)
  const setSelectedTaskId = useTasksStore((s) => s.setSelectedTaskId)
  const refreshTasks = useTasksStore((s) => s.refresh)

  const onBulkTaskStarted = (taskId: string, action: BulkActionKind): void => {
    setTasksOpen(true)
    setSelectedTaskId(taskId)
    void refreshTasks()
    if (action === 'zones.refresh_detail') {
      void (async () => {
        for (;;) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500))
          try {
            const detail = unwrapIpc(await window.mmcf.tasks.get(taskId))
            if (detail.state === 'completed' || detail.state === 'cancelled') {
              await useZonesStore.getState().hydrate()
              break
            }
          } catch {
            break
          }
        }
      })()
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        onOpenSettings={() => setView('settings')}
        onOpenTasks={() => setTasksOpen(true)}
      />
      {view === 'settings' ? (
        <SettingsPage onBack={() => setView('main')} />
      ) : (
        <ResizableSidebarLayout sidebar={<Sidebar onBulkTaskStarted={onBulkTaskStarted} />}>
          <MainContent />
        </ResizableSidebarLayout>
      )}
      <TasksPanel open={tasksOpen} onClose={() => setTasksOpen(false)} />
    </div>
  )
}

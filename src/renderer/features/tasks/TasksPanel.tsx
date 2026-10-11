import { useEffect, type JSX } from 'react'
import type { TaskDetail } from '@shared/schemas/tasks.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { useTasksStore } from '@renderer/stores/tasks-store'
import { Button } from '@renderer/components/ui/Button'
import { SimpleTable } from '@renderer/components/ui/SimpleTable'

type TasksPanelProps = {
  open: boolean
  onClose: () => void
}

function progressPercent(task: TaskDetail): number {
  const done = task.successCount + task.failedCount + task.cancelledCount
  if (task.selectedCount === 0) return 0
  return Math.round((done / task.selectedCount) * 100)
}

export function TasksPanel({ open, onClose }: TasksPanelProps): JSX.Element | null {
  const tasks = useTasksStore((s) => s.tasks)
  const selectedTask = useTasksStore((s) => s.selectedTask)
  const refresh = useTasksStore((s) => s.refresh)
  const setSelectedTaskId = useTasksStore((s) => s.setSelectedTaskId)

  useEffect(() => {
    if (!open) return
    void refresh()
    const timer = window.setInterval(() => void refresh(), 1500)
    return () => window.clearInterval(timer)
  }, [open, refresh])

  if (!open) return null

  const cancelRemaining = (taskId: string): void => {
    void (async () => {
      unwrapIpc(await window.mmcf.tasks.cancel(taskId))
      await refresh()
    })()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/35">
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">{strings.tasks.title}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {strings.write.cancel}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <ul className="mb-4 space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className={`w-full rounded-md border border-border px-3 py-2 text-left text-[0.9em] ${
                    selectedTask?.id === task.id ? 'bg-sidebar-active' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <p className="font-medium">{strings.bulk.actionName(task.kind as never)}</p>
                  <p className="text-muted-foreground">
                    {task.state} — {task.successCount}/{task.selectedCount}{' '}
                    {strings.tasks.successLabel}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {selectedTask ? (
            <div className="space-y-3">
              <p className="font-medium">{strings.bulk.actionName(selectedTask.kind as never)}</p>
              <p className="text-[0.9em] text-muted-foreground">
                {selectedTask.successCount + selectedTask.failedCount + selectedTask.cancelledCount} /{' '}
                {selectedTask.selectedCount} {strings.tasks.completedLabel}
              </p>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${progressPercent(selectedTask)}%` }}
                />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-[0.85em]">
                <div>
                  {strings.tasks.successLabel}: {selectedTask.successCount}
                </div>
                <div>
                  {strings.tasks.failedLabel}: {selectedTask.failedCount}
                </div>
                <div>
                  {strings.tasks.runningLabel}: {selectedTask.runningCount}
                </div>
                <div>
                  {strings.tasks.queuedLabel}: {selectedTask.queuedCount}
                </div>
              </dl>
              {selectedTask.state === 'running' || selectedTask.state === 'pending' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => cancelRemaining(selectedTask.id)}
                >
                  {strings.tasks.cancelRemaining}
                </Button>
              ) : null}
              <SimpleTable
                rows={selectedTask.items}
                emptyMessage={strings.tasks.noItems}
                columns={[
                  {
                    key: 'domain',
                    header: strings.zoneTabs.fields.domain,
                    render: (row) => row.domain,
                  },
                  {
                    key: 'state',
                    header: strings.activity.columns.status,
                    render: (row) => row.state,
                  },
                  {
                    key: 'error',
                    header: strings.activity.columns.error,
                    render: (row) => row.errorMessage ?? '—',
                  },
                ]}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">{strings.tasks.selectTaskHint}</p>
          )}
        </div>
      </aside>
    </div>
  )
}

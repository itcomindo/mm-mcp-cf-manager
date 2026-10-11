import { create } from 'zustand'
import type { TaskDetail, TaskSummary } from '@shared/schemas/tasks.schema'
import { unwrapIpc } from '@renderer/lib/mmcf-client'

type TasksState = {
  activeCount: number
  tasks: TaskSummary[]
  selectedTask: TaskDetail | null
  loading: boolean
  refresh: () => Promise<void>
  loadTask: (taskId: string) => Promise<void>
  setSelectedTaskId: (taskId: string | null) => void
}

export const useTasksStore = create<TasksState>((set, get) => ({
  activeCount: 0,
  tasks: [],
  selectedTask: null,
  loading: false,
  refresh: async () => {
    set({ loading: true })
    try {
      const result = unwrapIpc(await window.mmcf.tasks.listActive())
      set({ tasks: result.tasks, activeCount: result.activeCount })
      const selected = get().selectedTask
      if (selected) {
        const detail = unwrapIpc(await window.mmcf.tasks.get(selected.id))
        set({ selectedTask: detail })
      }
    } finally {
      set({ loading: false })
    }
  },
  loadTask: async (taskId: string) => {
    const detail = unwrapIpc(await window.mmcf.tasks.get(taskId))
    set({ selectedTask: detail })
  },
  setSelectedTaskId: (taskId) => {
    if (!taskId) {
      set({ selectedTask: null })
      return
    }
    void get().loadTask(taskId)
  },
}))

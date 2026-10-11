import { ipcMain } from 'electron'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import {
  bulkCreateTaskSchema,
  bulkPreviewQuerySchema,
  taskIdParamSchema,
} from '@shared/schemas/tasks.schema'
import type { TaskQueueService } from '../tasks/task-queue.service'
import type { Logger } from '../logging/logger'
import { ipcErr, ipcOk } from './ipc-result'

export function registerTaskHandlers(deps: {
  taskQueueService: TaskQueueService
  logger: Logger
}): void {
  const { taskQueueService, logger } = deps

  ipcMain.handle('mmcf:bulk:preview', (_event, raw: unknown) => {
    const parsed = bulkPreviewQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(
        taskQueueService.preview(parsed.data.action, parsed.data.zoneIds),
      )
    } catch (error) {
      logger.error('bulk:preview failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to preview bulk action.')
    }
  })

  ipcMain.handle('mmcf:bulk:createTask', (_event, raw: unknown) => {
    const parsed = bulkCreateTaskSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(
        taskQueueService.createAndStart(parsed.data.action, parsed.data.zoneIds),
      )
    } catch (error) {
      logger.error('bulk:createTask failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to start bulk task.')
    }
  })

  ipcMain.handle('mmcf:tasks:get', (_event, raw: unknown) => {
    const parsed = taskIdParamSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      const detail = taskQueueService.getTaskDetail(parsed.data.taskId)
      if (!detail) {
        return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, 'Task not found.')
      }
      return ipcOk(detail)
    } catch (error) {
      logger.error('tasks:get failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to load task.')
    }
  })

  ipcMain.handle('mmcf:tasks:listActive', () => {
    try {
      return ipcOk(taskQueueService.listActiveTasks())
    } catch (error) {
      logger.error('tasks:listActive failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to list tasks.')
    }
  })

  ipcMain.handle('mmcf:tasks:cancel', (_event, raw: unknown) => {
    const parsed = taskIdParamSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      taskQueueService.cancelRemaining(parsed.data.taskId)
      return ipcOk({ cancelled: true })
    } catch (error) {
      logger.error('tasks:cancel failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to cancel task.')
    }
  })
}

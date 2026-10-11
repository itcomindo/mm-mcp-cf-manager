import { randomUUID } from 'node:crypto'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import type {
  ActiveTasksResult,
  BulkActionKind,
  BulkPreviewResult,
  TaskDetail,
  TaskSummary,
} from '@shared/schemas/tasks.schema'
import type { WriteInvokeContext } from '@shared/types/write-context'
import type { CacheService } from '../cloudflare/cache/cache.service'
import type { SecurityService } from '../cloudflare/security/security.service'
import type { ZoneReadService } from '../cloudflare/zones/zone-read.service'
import { readZoneCapabilities } from '../cloudflare/zone-capabilities.util'
import type { DatabaseService } from '../persistence/database.service'
import type { SettingsService } from '../services/settings.service'
import type { Logger } from '../logging/logger'
import { normalizeMcpError } from '../mcp/mcp-error-normalizer'
import { BULK_ACTION_DEFINITIONS, bulkActionLabel } from './bulk-action.registry'
import type { CapabilityState } from '@shared/schemas/capabilities.schema'
import type { ZoneEligibility } from './task-eligibility'
import { eligibilityFromCapability, eligibilityFromZoneCached } from './task-eligibility'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableError(error: unknown): { retryable: boolean; retryAfterMs: number } {
  const code = (error as { code?: string }).code
  if (code === APP_ERROR_CODES.RATE_LIMITED || code === APP_ERROR_CODES.NETWORK_ERROR) {
    const normalized = normalizeMcpError(error)
    return { retryable: true, retryAfterMs: normalized.retryAfterMs ?? 2_000 }
  }
  const normalized = normalizeMcpError(error)
  return { retryable: normalized.retryable, retryAfterMs: normalized.retryAfterMs ?? 2_000 }
}

export class TaskQueueService {
  private cancelRequested = new Set<string>()
  private runningTasks = new Set<string>()

  constructor(
    private database: DatabaseService,
    private settingsService: SettingsService,
    private cacheService: CacheService,
    private securityService: SecurityService,
    private zoneReadService: ZoneReadService,
    private logger: Logger,
  ) {}

  private zoneEligibility(
    action: BulkActionKind,
    _zoneId: string,
    zoneExists: boolean,
    capState: CapabilityState | undefined,
  ): ZoneEligibility {
    const def = BULK_ACTION_DEFINITIONS[action]
    if (def.readOnlyRefresh) {
      return eligibilityFromZoneCached(zoneExists)
    }
    return eligibilityFromCapability(capState)
  }

  preview(action: BulkActionKind, zoneIds: string[]): BulkPreviewResult {
    const def = BULK_ACTION_DEFINITIONS[action]
    const zones = zoneIds.map((zoneId) => {
      const zone = this.database.getZoneById(zoneId)
      const caps = readZoneCapabilities(this.database, zoneId)
      const capState = caps[def.capabilityKey]
      return {
        zoneId,
        domain: zone?.domain ?? zoneId,
        eligibility: this.zoneEligibility(action, zoneId, zone !== null, capState),
      }
    })

    let eligible = 0
    let permissionMissing = 0
    let unsupported = 0
    for (const zone of zones) {
      if (zone.eligibility === 'eligible') eligible += 1
      else if (zone.eligibility === 'permission_missing') permissionMissing += 1
      else unsupported += 1
    }

    return {
      action,
      actionLabel: bulkActionLabel(action),
      zones,
      eligible,
      permissionMissing,
      unsupported,
      total: zones.length,
    }
  }

  createAndStart(action: BulkActionKind, zoneIds: string[]): { taskId: string } {
    const taskId = randomUUID()
    const def = BULK_ACTION_DEFINITIONS[action]
    const dryRun = this.settingsService.getAll().behavior.dryRun
    const uniqueZoneIds = [...new Set(zoneIds)]

    this.database.insertTask({
      id: taskId,
      kind: action,
      source: dryRun ? 'dry_run' : 'bulk',
      state: 'pending',
      selectedCount: uniqueZoneIds.length,
    })

    for (const zoneId of uniqueZoneIds) {
      const zone = this.database.getZoneById(zoneId)
      this.database.insertTaskItem({
        taskId,
        zoneId,
        domain: zone?.domain ?? zoneId,
        action,
        resource: def.resource,
        state: 'queued',
      })
    }

    void this.runTask(taskId).catch((error) => {
      this.logger.error('Bulk task failed unexpectedly', { taskId, error })
    })

    return { taskId }
  }

  cancelRemaining(taskId: string): void {
    this.cancelRequested.add(taskId)
    const row = this.database.getTaskRow(taskId)
    if (row && (row.state === 'pending' || row.state === 'running')) {
      this.database.updateTaskState(taskId, 'cancelled', { finishedAt: new Date().toISOString() })
    }
    const items = this.database.listTaskItems(taskId)
    for (const item of items) {
      if (item.state === 'queued' || item.state === 'waiting') {
        this.database.updateTaskItem(item.id, {
          state: 'cancelled',
          finishedAt: new Date().toISOString(),
        })
      }
    }
  }

  getTaskDetail(taskId: string): TaskDetail | null {
    const row = this.database.getTaskRow(taskId)
    if (!row) return null
    const items = this.database.listTaskItems(taskId)
    const summary = this.buildSummary(row, items)
    return { ...summary, items }
  }

  listActiveTasks(): ActiveTasksResult {
    const tasks = this.database.listRecentTasks(30).map((row) => {
      const items = this.database.listTaskItems(row.id)
      return this.buildSummary(row, items)
    })
    const activeCount = tasks.filter((task) => task.state === 'pending' || task.state === 'running').length
    return { tasks, activeCount }
  }

  private buildSummary(
    row: {
      id: string
      kind: string
      source: string
      state: TaskSummary['state']
      selectedCount: number
      createdAt: string
      startedAt: string | null
      finishedAt: string | null
    },
    items: Array<{ state: string }>,
  ): TaskSummary {
    const counts = {
      successCount: 0,
      failedCount: 0,
      runningCount: 0,
      queuedCount: 0,
      cancelledCount: 0,
    }
    for (const item of items) {
      if (item.state === 'success') counts.successCount += 1
      else if (item.state === 'failed') counts.failedCount += 1
      else if (item.state === 'running') counts.runningCount += 1
      else if (item.state === 'cancelled') counts.cancelledCount += 1
      else if (item.state === 'queued' || item.state === 'waiting') counts.queuedCount += 1
    }
    return {
      id: row.id,
      kind: row.kind,
      source: row.source,
      state: row.state,
      selectedCount: row.selectedCount,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      ...counts,
    }
  }

  private async runTask(taskId: string): Promise<void> {
    if (this.runningTasks.has(taskId)) return
    this.runningTasks.add(taskId)
    try {
      const row = this.database.getTaskRow(taskId)
      if (!row) return

      this.database.updateTaskState(taskId, 'running', { startedAt: new Date().toISOString() })
      const settings = this.settingsService.getAll().behavior
      const concurrency = settings.bulkConcurrency
      const maxAttempts = settings.maxRetries + 1

      const items = this.database.listTaskItems(taskId)
      const queue = [...items]
      const workers: Promise<void>[] = []

      const worker = async (): Promise<void> => {
        while (queue.length > 0) {
          if (this.cancelRequested.has(taskId)) break
          const item = queue.shift()
          if (!item) break
          if (item.state !== 'queued' && item.state !== 'waiting') continue

          await this.processItem(taskId, item.id, item.zoneId, item.action as BulkActionKind, maxAttempts)
        }
      }

      for (let i = 0; i < concurrency; i += 1) {
        workers.push(worker())
      }
      await Promise.all(workers)

      const finalItems = this.database.listTaskItems(taskId)
      const hasRunning = finalItems.some((item) => item.state === 'running')
      const state = this.cancelRequested.has(taskId)
        ? 'cancelled'
        : hasRunning
          ? 'running'
          : 'completed'
      this.database.updateTaskState(taskId, state, { finishedAt: new Date().toISOString() })
    } finally {
      this.runningTasks.delete(taskId)
      this.cancelRequested.delete(taskId)
    }
  }

  private async processItem(
    taskId: string,
    itemId: number,
    zoneId: string,
    action: BulkActionKind,
    maxAttempts: number,
  ): Promise<void> {
    if (this.cancelRequested.has(taskId)) {
      this.database.updateTaskItem(itemId, {
        state: 'cancelled',
        finishedAt: new Date().toISOString(),
      })
      return
    }

    const def = BULK_ACTION_DEFINITIONS[action]
    const zoneRow = this.database.getZoneById(zoneId)
    const caps = readZoneCapabilities(this.database, zoneId)
    const capState = caps[def.capabilityKey]
    if (this.zoneEligibility(action, zoneId, zoneRow !== null, capState) !== 'eligible') {
      this.database.updateTaskItem(itemId, {
        state: 'failed',
        errorCode: APP_ERROR_CODES.ACTION_NOT_AVAILABLE,
        errorMessage: 'Action not available for this zone/token.',
        finishedAt: new Date().toISOString(),
      })
      return
    }

    let attempts = 0
    while (attempts < maxAttempts) {
      if (this.cancelRequested.has(taskId)) {
        this.database.updateTaskItem(itemId, {
          state: 'cancelled',
          finishedAt: new Date().toISOString(),
        })
        return
      }

      attempts += 1
      this.database.updateTaskItem(itemId, {
        state: 'running',
        attempts,
        startedAt: new Date().toISOString(),
        errorCode: null,
        errorMessage: null,
      })

      const ctx: WriteInvokeContext = { activitySource: 'bulk', taskId }
      try {
        await this.executeBulkAction(action, zoneId, ctx)
        this.database.updateTaskItem(itemId, {
          state: 'success',
          finishedAt: new Date().toISOString(),
        })
        return
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed.'
        const code = (error as { code?: string }).code ?? APP_ERROR_CODES.UNKNOWN
        const { retryable, retryAfterMs } = isRetryableError(error)
        if (retryable && attempts < maxAttempts) {
          this.database.updateTaskItem(itemId, {
            state: 'waiting',
            errorCode: code,
            errorMessage: message,
          })
          await sleep(retryAfterMs)
          continue
        }
        this.database.updateTaskItem(itemId, {
          state: 'failed',
          errorCode: code,
          errorMessage: message,
          finishedAt: new Date().toISOString(),
        })
        return
      }
    }
  }

  private async executeBulkAction(
    action: BulkActionKind,
    zoneId: string,
    ctx: WriteInvokeContext,
  ): Promise<void> {
    switch (action) {
      case 'cache.purge_everything':
        await this.cacheService.purgeEverything(zoneId, ctx)
        return
      case 'cache.development_mode_on':
        await this.cacheService.setDevelopmentMode(zoneId, true, ctx)
        return
      case 'cache.development_mode_off':
        await this.cacheService.setDevelopmentMode(zoneId, false, ctx)
        return
      case 'security.under_attack_on':
        await this.securityService.setUnderAttackMode(zoneId, true, undefined, ctx)
        return
      case 'security.under_attack_off':
        await this.securityService.setUnderAttackMode(zoneId, false, 'medium', ctx)
        return
      case 'zones.refresh_detail':
        await this.zoneReadService.refreshZone(zoneId)
        return
      default:
        throw Object.assign(new Error('Unsupported bulk action.'), {
          code: APP_ERROR_CODES.VALIDATION_FAILED,
        })
    }
  }
}

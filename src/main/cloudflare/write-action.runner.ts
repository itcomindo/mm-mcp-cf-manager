import { isCapabilityWritable } from '@shared/capabilities/is-writable'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import type { CapabilityKey, CapabilityState } from '@shared/schemas/capabilities.schema'
import type { WriteActionResult } from '@shared/schemas/write-actions.schema'
import type { ConnectionService } from '../services/connection.service'
import type { SettingsService } from '../services/settings.service'
import type { DatabaseService } from '../persistence/database.service'
import type { ActivityService } from './activity.service'
import type { ResourceLockService, ResourceScope } from './resource-lock.service'

export const ACCOUNT_IP_ACCESS_DOMAIN_LABEL = '(all zones)'

type RunWriteInput<T> = {
  zoneId: string
  scope: ResourceScope
  capabilityKey: CapabilityKey
  capabilityState: CapabilityState | undefined
  action: string
  target?: string
  previousValue?: string
  newValue?: string
  activitySource?: 'single' | 'bulk'
  taskId?: string
  execute: () => Promise<T>
  onSuccess?: (result: T) => void
}

export class WriteActionRunner {
  constructor(
    private database: DatabaseService,
    private settingsService: SettingsService,
    private connectionService: ConnectionService,
    private locks: ResourceLockService,
    private activity: ActivityService,
  ) {}

  async run<T>(input: RunWriteInput<T>): Promise<WriteActionResult & { result?: T }> {
    const zone = this.database.getZoneById(input.zoneId)
    if (!zone) {
      throw Object.assign(new Error('Zone not found in local cache. Sync zones first.'), {
        code: APP_ERROR_CODES.VALIDATION_FAILED,
      })
    }

    if (!isCapabilityWritable(input.capabilityState)) {
      throw Object.assign(new Error('This action is not available for the current token or plan.'), {
        code: APP_ERROR_CODES.ACTION_NOT_AVAILABLE,
      })
    }

    if (!this.locks.tryAcquire(input.zoneId, input.scope)) {
      throw Object.assign(new Error('Another write is already running for this zone resource.'), {
        code: APP_ERROR_CODES.RESOURCE_LOCKED,
      })
    }

    const dryRun = this.settingsService.getAll().behavior.dryRun

    try {
      await this.connectionService.requireToken()

      if (dryRun) {
        this.activity.record({
          zoneId: input.zoneId,
          domain: zone.domain,
          action: input.action,
          target: input.target ?? null,
          previousValue: input.previousValue ?? null,
          newValue: input.newValue ?? null,
          status: 'dry_run',
          source: input.activitySource ?? 'single',
          taskId: input.taskId ?? null,
        })
        return { dryRun: true, message: 'Dry Run — no change sent to Cloudflare.' }
      }

      const result = await input.execute()
      input.onSuccess?.(result)
      this.connectionService.touchMcpSuccess()
      this.activity.record({
        zoneId: input.zoneId,
        domain: zone.domain,
        action: input.action,
        target: input.target ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        status: 'success',
        source: input.activitySource ?? 'single',
        taskId: input.taskId ?? null,
      })
      return { dryRun: false, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Write failed.'
      this.activity.record({
        zoneId: input.zoneId,
        domain: zone.domain,
        action: input.action,
        target: input.target ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        status: 'failed',
        errorSummary: message,
        source: input.activitySource ?? 'single',
        taskId: input.taskId ?? null,
      })
      throw error
    } finally {
      this.locks.release(input.zoneId, input.scope)
    }
  }

  async runAccount<T>(input: {
    accountId: string
    writeState: CapabilityState | undefined
    action: string
    target?: string
    previousValue?: string
    newValue?: string
    execute: () => Promise<T>
    onSuccess?: (result: T) => void
  }): Promise<WriteActionResult & { result?: T }> {
    if (!isCapabilityWritable(input.writeState)) {
      throw Object.assign(new Error('This action is not available for the current token.'), {
        code: APP_ERROR_CODES.ACTION_NOT_AVAILABLE,
      })
    }

    const dryRun = this.settingsService.getAll().behavior.dryRun

    try {
      await this.connectionService.requireToken()

      if (dryRun) {
        this.activity.record({
          zoneId: input.accountId,
          domain: ACCOUNT_IP_ACCESS_DOMAIN_LABEL,
          action: input.action,
          target: input.target ?? null,
          previousValue: input.previousValue ?? null,
          newValue: input.newValue ?? null,
          status: 'dry_run',
          source: 'single',
          taskId: null,
        })
        return { dryRun: true, message: 'Dry Run — no change sent to Cloudflare.' }
      }

      const result = await input.execute()
      input.onSuccess?.(result)
      this.connectionService.touchMcpSuccess()
      this.activity.record({
        zoneId: input.accountId,
        domain: ACCOUNT_IP_ACCESS_DOMAIN_LABEL,
        action: input.action,
        target: input.target ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        status: 'success',
        source: 'single',
        taskId: null,
      })
      return { dryRun: false, result }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Write failed.'
      this.activity.record({
        zoneId: input.accountId,
        domain: ACCOUNT_IP_ACCESS_DOMAIN_LABEL,
        action: input.action,
        target: input.target ?? null,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        status: 'failed',
        errorSummary: message,
        source: 'single',
        taskId: null,
      })
      throw error
    }
  }
}

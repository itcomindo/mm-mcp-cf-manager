import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import {
  DEFAULT_APP_SETTINGS,
  appSettingsSchema,
  type AppSettings,
} from '@shared/schemas/settings.schema'
import type { ActivityEntry, ActivityStatus } from '@shared/schemas/activity.schema'
import type { TaskItemState, TaskState } from '@shared/schemas/tasks.schema'
import type { ZoneSummary } from '@shared/schemas/zones.schema'
import {
  mergeZoneReadCachePayload,
  parseZoneCachePurgeState,
  parseZoneDetailRefreshedAt,
  parseZoneReadCacheJson,
  type ZoneReadCacheUpdate,
} from '@shared/zones/zone-read-cache'
import { parseZoneSnapshotFlags } from '@shared/zones/zone-snapshot-flags'
import type { Logger } from '../logging/logger'
import { MIGRATION_STATEMENTS, SCHEMA_VERSION } from './migrations'

const SETTINGS_KEY = 'app.settings'

export class DatabaseService {
  private db: DatabaseSync

  constructor(dbPath: string, private logger: Logger) {
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA foreign_keys = ON;')
    this.runMigrations()
  }

  private runMigrations(): void {
    for (const statement of MIGRATION_STATEMENTS) {
      this.db.exec(statement)
    }
    const row = this.db
      .prepare('SELECT version FROM schema_migrations WHERE version = ?')
      .get(SCHEMA_VERSION) as { version: number } | undefined
    if (!row) {
      this.db
        .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(SCHEMA_VERSION, new Date().toISOString())
    }
    this.logger.info('Database ready', { schemaVersion: SCHEMA_VERSION })
  }

  getAppSettings(): AppSettings {
    const row = this.db
      .prepare('SELECT value_json FROM app_settings WHERE key = ?')
      .get(SETTINGS_KEY) as { value_json: string } | undefined
    if (!row) {
      return DEFAULT_APP_SETTINGS
    }
    try {
      const parsed = JSON.parse(row.value_json) as unknown
      return appSettingsSchema.parse(parsed)
    } catch (error) {
      this.logger.warn('Invalid stored settings; using defaults', { error })
      return DEFAULT_APP_SETTINGS
    }
  }

  saveAppSettings(settings: AppSettings): AppSettings {
    const validated = appSettingsSchema.parse(settings)
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      )
      .run(SETTINGS_KEY, JSON.stringify(validated), now)
    return validated
  }

  updateAppSettings(updater: (current: AppSettings) => AppSettings): AppSettings {
    const next = updater(this.getAppSettings())
    return this.saveAppSettings(next)
  }

  getJsonSetting<T>(key: string, fallback: T, validate?: (value: unknown) => T): T {
    const row = this.db
      .prepare('SELECT value_json FROM app_settings WHERE key = ?')
      .get(key) as { value_json: string } | undefined
    if (!row) return fallback
    try {
      const parsed = JSON.parse(row.value_json) as unknown
      return validate ? validate(parsed) : (parsed as T)
    } catch (error) {
      this.logger.warn('Invalid JSON setting; using fallback', { key, error })
      return fallback
    }
  }

  setJsonSetting(key: string, value: unknown): void {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO app_settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      )
      .run(key, JSON.stringify(value), now)
  }

  upsertZones(zones: ZoneSummary[]): void {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(
      `INSERT INTO zones (
        zone_id, account_id, domain, status, plan_name, last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(zone_id) DO UPDATE SET
        account_id = excluded.account_id,
        domain = excluded.domain,
        status = excluded.status,
        plan_name = excluded.plan_name,
        last_synced_at = excluded.last_synced_at,
        updated_at = excluded.updated_at`,
    )

    this.db.exec('BEGIN IMMEDIATE')
    try {
      for (const zone of zones) {
        stmt.run(
          zone.zoneId,
          zone.accountId,
          zone.domain,
          zone.status,
          zone.planName,
          zone.lastSyncedAt,
          now,
          now,
        )
      }
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  getZoneById(zoneId: string): (ZoneSummary & { capabilitiesJson: string | null }) | null {
    const row = this.db
      .prepare(
        `SELECT zone_id, account_id, domain, status, plan_name, last_synced_at, capabilities_json
         FROM zones WHERE zone_id = ?`,
      )
      .get(zoneId) as
      | {
          zone_id: string
          account_id: string | null
          domain: string
          status: string | null
          plan_name: string | null
          last_synced_at: string | null
          capabilities_json: string | null
        }
      | undefined
    if (!row) return null
    const flags = parseZoneSnapshotFlags(row.capabilities_json)
    return {
      zoneId: row.zone_id,
      accountId: row.account_id,
      domain: row.domain,
      status: row.status,
      planName: row.plan_name,
      lastSyncedAt: row.last_synced_at,
      detailRefreshedAt: parseZoneDetailRefreshedAt(row.capabilities_json),
      developmentMode: flags.developmentMode,
      underAttackMode: flags.underAttackMode,
      cachePurge: parseZoneCachePurgeState(row.capabilities_json),
      capabilitiesJson: row.capabilities_json,
    }
  }

  updateZoneReadCache(zoneId: string, input: ZoneReadCacheUpdate & {
    status?: string | null
    planName?: string | null
    accountId?: string | null
  }): void {
    const now = new Date().toISOString()
    const row = this.db
      .prepare('SELECT capabilities_json FROM zones WHERE zone_id = ?')
      .get(zoneId) as { capabilities_json: string | null } | undefined
    const existing = parseZoneReadCacheJson(row?.capabilities_json ?? null)
    const payload = mergeZoneReadCachePayload(existing, input)
    this.db
      .prepare(
        `UPDATE zones SET
          status = COALESCE(?, status),
          plan_name = COALESCE(?, plan_name),
          account_id = COALESCE(?, account_id),
          capabilities_json = ?,
          updated_at = ?
        WHERE zone_id = ?`,
      )
      .run(
        input.status ?? null,
        input.planName ?? null,
        input.accountId ?? null,
        JSON.stringify(payload),
        now,
        zoneId,
      )
  }

  insertActivity(input: {
    zoneId: string
    domain: string
    action: string
    target?: string | null
    previousValue?: string | null
    newValue?: string | null
    status: ActivityStatus
    source?: 'single' | 'bulk'
    taskId?: string | null
    errorSummary?: string | null
  }): ActivityEntry {
    const createdAt = new Date().toISOString()
    const result = this.db
      .prepare(
        `INSERT INTO activity (
          zone_id, domain, action, target, previous_value, new_value,
          status, source, task_id, error_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.zoneId,
        input.domain,
        input.action,
        input.target ?? null,
        input.previousValue ?? null,
        input.newValue ?? null,
        input.status,
        input.source ?? 'single',
        input.taskId ?? null,
        input.errorSummary ?? null,
        createdAt,
      )
    const id = Number(result.lastInsertRowid)
    return {
      id,
      zoneId: input.zoneId,
      domain: input.domain,
      action: input.action,
      target: input.target ?? null,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      status: input.status,
      source: input.source ?? 'single',
      taskId: input.taskId ?? null,
      errorSummary: input.errorSummary ?? null,
      createdAt,
    }
  }

  listActivityForZone(zoneId: string, limit = 100): ActivityEntry[] {
    const rows = this.db
      .prepare(
        `SELECT id, zone_id, domain, action, target, previous_value, new_value,
                status, source, task_id, error_summary, created_at
         FROM activity
         WHERE zone_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(zoneId, limit) as Array<{
      id: number
      zone_id: string
      domain: string
      action: string
      target: string | null
      previous_value: string | null
      new_value: string | null
      status: ActivityStatus
      source: 'single' | 'bulk'
      task_id: string | null
      error_summary: string | null
      created_at: string
    }>

    return rows.map((row) => ({
      id: row.id,
      zoneId: row.zone_id,
      domain: row.domain,
      action: row.action,
      target: row.target,
      previousValue: row.previous_value,
      newValue: row.new_value,
      status: row.status,
      source: row.source,
      taskId: row.task_id,
      errorSummary: row.error_summary,
      createdAt: row.created_at,
    }))
  }

  insertTask(input: {
    id: string
    kind: string
    source: string
    state: TaskState
    selectedCount: number
  }): void {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO tasks (id, kind, source, state, selected_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.id, input.kind, input.source, input.state, input.selectedCount, now)
  }

  updateTaskState(
    taskId: string,
    state: TaskState,
    timestamps?: { startedAt?: string; finishedAt?: string; summaryJson?: string },
  ): void {
    this.db
      .prepare(
        `UPDATE tasks SET
          state = ?,
          started_at = COALESCE(?, started_at),
          finished_at = COALESCE(?, finished_at),
          summary_json = COALESCE(?, summary_json)
         WHERE id = ?`,
      )
      .run(
        state,
        timestamps?.startedAt ?? null,
        timestamps?.finishedAt ?? null,
        timestamps?.summaryJson ?? null,
        taskId,
      )
  }

  insertTaskItem(input: {
    taskId: string
    zoneId: string
    domain: string
    action: string
    resource: string
    state: TaskItemState
  }): number {
    const result = this.db
      .prepare(
        `INSERT INTO task_items (
          task_id, zone_id, domain, action, resource, state, attempts
        ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      )
      .run(input.taskId, input.zoneId, input.domain, input.action, input.resource, input.state)
    return Number(result.lastInsertRowid)
  }

  listTaskItems(taskId: string): Array<{
    id: number
    taskId: string
    zoneId: string
    domain: string
    action: string
    resource: string | null
    state: TaskItemState
    attempts: number
    errorCode: string | null
    errorMessage: string | null
    startedAt: string | null
    finishedAt: string | null
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, task_id, zone_id, domain, action, resource, state, attempts,
                error_code, error_message, started_at, finished_at
         FROM task_items WHERE task_id = ? ORDER BY id ASC`,
      )
      .all(taskId) as Array<{
      id: number
      task_id: string
      zone_id: string
      domain: string
      action: string
      resource: string | null
      state: TaskItemState
      attempts: number
      error_code: string | null
      error_message: string | null
      started_at: string | null
      finished_at: string | null
    }>
    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      zoneId: row.zone_id,
      domain: row.domain,
      action: row.action,
      resource: row.resource,
      state: row.state,
      attempts: row.attempts,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }))
  }

  updateTaskItem(
    itemId: number,
    patch: {
      state?: TaskItemState
      attempts?: number
      errorCode?: string | null
      errorMessage?: string | null
      startedAt?: string | null
      finishedAt?: string | null
    },
  ): void {
    const current = this.db
      .prepare('SELECT state, attempts, error_code, error_message, started_at, finished_at FROM task_items WHERE id = ?')
      .get(itemId) as
      | {
          state: TaskItemState
          attempts: number
          error_code: string | null
          error_message: string | null
          started_at: string | null
          finished_at: string | null
        }
      | undefined
    if (!current) return
    this.db
      .prepare(
        `UPDATE task_items SET
          state = ?,
          attempts = ?,
          error_code = ?,
          error_message = ?,
          started_at = ?,
          finished_at = ?
         WHERE id = ?`,
      )
      .run(
        patch.state ?? current.state,
        patch.attempts ?? current.attempts,
        patch.errorCode !== undefined ? patch.errorCode : current.error_code,
        patch.errorMessage !== undefined ? patch.errorMessage : current.error_message,
        patch.startedAt !== undefined ? patch.startedAt : current.started_at,
        patch.finishedAt !== undefined ? patch.finishedAt : current.finished_at,
        itemId,
      )
  }

  getTaskRow(taskId: string): {
    id: string
    kind: string
    source: string
    state: TaskState
    selectedCount: number
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
  } | null {
    const row = this.db
      .prepare(
        `SELECT id, kind, source, state, selected_count, created_at, started_at, finished_at
         FROM tasks WHERE id = ?`,
      )
      .get(taskId) as
      | {
          id: string
          kind: string
          source: string
          state: TaskState
          selected_count: number
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
      | undefined
    if (!row) return null
    return {
      id: row.id,
      kind: row.kind,
      source: row.source,
      state: row.state,
      selectedCount: row.selected_count,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }
  }

  listRecentTasks(limit = 20): Array<{
    id: string
    kind: string
    source: string
    state: TaskState
    selectedCount: number
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, kind, source, state, selected_count, created_at, started_at, finished_at
         FROM tasks ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit) as Array<{
      id: string
      kind: string
      source: string
      state: TaskState
      selected_count: number
      created_at: string
      started_at: string | null
      finished_at: string | null
    }>
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      source: row.source,
      state: row.state,
      selectedCount: row.selected_count,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }))
  }

  listZones(): ZoneSummary[] {
    const rows = this.db
      .prepare(
        `SELECT zone_id, account_id, domain, status, plan_name, last_synced_at, capabilities_json
         FROM zones
         ORDER BY domain COLLATE NOCASE ASC`,
      )
      .all() as Array<{
      zone_id: string
      account_id: string | null
      domain: string
      status: string | null
      plan_name: string | null
      last_synced_at: string | null
      capabilities_json: string | null
    }>

    return rows.map((row) => {
      const flags = parseZoneSnapshotFlags(row.capabilities_json)
      return {
        zoneId: row.zone_id,
        accountId: row.account_id,
        domain: row.domain,
        status: row.status,
        planName: row.plan_name,
        lastSyncedAt: row.last_synced_at,
        detailRefreshedAt: parseZoneDetailRefreshedAt(row.capabilities_json),
        developmentMode: flags.developmentMode,
        underAttackMode: flags.underAttackMode,
        cachePurge: parseZoneCachePurgeState(row.capabilities_json),
      }
    })
  }

  static resolveDatabasePath(userDataPath: string): string {
    return join(userDataPath, 'mm-mcp-cf-manager.sqlite')
  }
}

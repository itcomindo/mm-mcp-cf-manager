import {
  countFreePlanZones,
  normalizeCloudflareZoneRecord,
  type CloudflareZoneRecord,
} from '@shared/cloudflare/zone-pagination'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import type { SyncZonesResult, ZoneListResult, ZoneSummary } from '@shared/schemas/zones.schema'
import type { CloudflareMcpAdapter } from '../../mcp/cloudflare-mcp.adapter'
import { permissionMessageForOperation } from '../../mcp/mcp-error-normalizer'
import type { DatabaseService } from '../../persistence/database.service'
import type { ConnectionService } from '../../services/connection.service'

function mapZoneRecord(record: CloudflareZoneRecord, syncedAt: string): ZoneSummary | null {
  const normalized = normalizeCloudflareZoneRecord(record)
  if (!normalized?.id || !normalized.name) return null
  return {
    zoneId: normalized.id,
    accountId: normalized.account?.id ?? null,
    domain: normalized.name,
    status: normalized.status ?? null,
    planName: normalized.plan?.name ?? null,
    lastSyncedAt: syncedAt,
    detailRefreshedAt: null,
    developmentMode: null,
    underAttackMode: null,
  }
}

export class ZoneService {
  constructor(
    private database: DatabaseService,
    private connectionService: ConnectionService,
    private adapter: CloudflareMcpAdapter,
  ) {}

  listCached(): ZoneListResult {
    const zones = this.database.listZones()
    return { zones, total: zones.length }
  }

  async syncFromCloudflare(): Promise<SyncZonesResult> {
    const config = this.connectionService.getConfig()
    const token = await this.connectionService.requireToken()
    const syncedAt = new Date().toISOString()

    try {
      const records = await this.adapter.listAllZones(config.mcpEndpoint, token)
      const mapped = records
        .map((record) => mapZoneRecord(record, syncedAt))
        .filter((zone): zone is ZoneSummary => zone !== null)

      this.database.upsertZones(mapped)
      const freeZonesCount = countFreePlanZones(records)
      this.connectionService.updateZoneCounts(mapped.length, freeZonesCount, syncedAt)
      this.connectionService.touchMcpSuccess()

      return {
        syncedCount: mapped.length,
        freeZonesCount,
        syncedAt,
      }
    } catch (error) {
      const code = (error as { normalized?: { code?: string } }).normalized?.code
      const message =
        code === APP_ERROR_CODES.AUTH_PERMISSION_MISSING
          ? permissionMessageForOperation('zones')
          : error instanceof Error
            ? error.message
            : 'Zone sync failed.'
      throw Object.assign(new Error(message), {
        code: code ?? APP_ERROR_CODES.MCP_TOOL_ERROR,
      })
    }
  }
}

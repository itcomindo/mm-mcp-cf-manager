import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import { defaultZoneCapabilities } from '@shared/schemas/capabilities.schema'
import type {
  CacheStatus,
  DnsListResult,
  SecurityStatus,
  WafListResult,
  ZoneOverview,
} from '@shared/schemas/zone-read.schema'
import type { CloudflareMcpAdapter } from '../../mcp/cloudflare-mcp.adapter'
import {
  buildListDnsRecordsExecuteCode,
  buildListWafRulesExecuteCode,
  buildZoneOverviewExecuteCode,
} from '../../mcp/safe-execute'
import type { DatabaseService } from '../../persistence/database.service'
import type { ConnectionService } from '../../services/connection.service'
import { CapabilityService } from '../capability.service'
import { parseZoneReadCacheJson } from '@shared/zones/zone-read-cache'
import { mapDnsRecord, mapOverviewPayload, mapWafRule } from './zone-read.mappers'

function parseReadCache(json: string | null) {
  return parseZoneReadCacheJson(json)
}

export class ZoneReadService {
  private capabilityService = new CapabilityService()

  constructor(
    private database: DatabaseService,
    private connectionService: ConnectionService,
    private adapter: CloudflareMcpAdapter,
  ) {}

  private requireCachedZone(zoneId: string) {
    const zone = this.database.getZoneById(zoneId)
    if (!zone) {
      throw Object.assign(new Error('Zone not found in local cache. Sync zones first.'), {
        code: APP_ERROR_CODES.VALIDATION_FAILED,
      })
    }
    return zone
  }

  getOverview(zoneId: string): ZoneOverview {
    const zone = this.requireCachedZone(zoneId)
    const cache = parseReadCache(zone.capabilitiesJson)
    const snap = cache.snapshot ?? {}
    return mapOverviewPayload({
      zone: {
        id: zone.zoneId,
        name: zone.domain,
        status: zone.status ?? undefined,
        account: { id: zone.accountId ?? undefined },
        plan: { name: zone.planName ?? undefined },
      },
      developmentMode: snap.developmentMode ?? null,
      securityLevel: snap.securityLevel ?? null,
      underAttackMode: snap.underAttackMode ?? null,
      sslMode: snap.sslMode ?? null,
      cached: {
        lastSyncedAt: zone.lastSyncedAt,
        detailRefreshedAt: cache.detailRefreshedAt ?? null,
        capabilities: cache.capabilities ?? defaultZoneCapabilities(),
      },
    })
  }

  async refreshZone(zoneId: string): Promise<ZoneOverview> {
    const zone = this.requireCachedZone(zoneId)
    const config = this.connectionService.getConfig()
    const token = await this.connectionService.requireToken()

    const result = await this.adapter.executeReviewed<{
      ok: true
      zone: Record<string, unknown>
      developmentMode: boolean | null
      securityLevel: string | null
      underAttackMode: boolean | null
      sslMode: string | null
      probes: {
        devSuccess: boolean
        devStatus: number
        secSuccess: boolean
        secStatus: number
        sslSuccess: boolean
        sslStatus: number
      }
    }>(config.mcpEndpoint, token, buildZoneOverviewExecuteCode(zoneId))

    const detailRefreshedAt = new Date().toISOString()
    const cache = parseReadCache(zone.capabilitiesJson)
    const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
      devSuccess: result.probes.devSuccess,
      devStatus: result.probes.devStatus,
      secSuccess: result.probes.secSuccess,
      secStatus: result.probes.secStatus,
    })

    const overview = mapOverviewPayload({
      zone: result.zone as {
        id?: string
        name?: string
        status?: string
        account?: { id?: string }
        plan?: { name?: string }
      },
      developmentMode: result.developmentMode,
      securityLevel: result.securityLevel,
      underAttackMode: result.underAttackMode,
      sslMode: result.sslMode,
      cached: {
        lastSyncedAt: zone.lastSyncedAt,
        detailRefreshedAt,
        capabilities,
      },
    })

    this.database.updateZoneReadCache(zoneId, {
      status: overview.status,
      planName: overview.planName,
      accountId: overview.accountId,
      capabilities,
      detailRefreshedAt,
      snapshot: overview,
    })
    this.connectionService.touchMcpSuccess()
    return overview
  }

  async listDns(zoneId: string, search?: string): Promise<DnsListResult> {
    this.requireCachedZone(zoneId)
    const config = this.connectionService.getConfig()
    const token = await this.connectionService.requireToken()

    try {
      const result = await this.adapter.executeReviewed<{
        ok: true
        records: Array<Record<string, unknown>>
      }>(config.mcpEndpoint, token, buildListDnsRecordsExecuteCode(zoneId))

      let records = result.records
        .map((row) => mapDnsRecord(row))
        .filter((row): row is NonNullable<typeof row> => row !== null)

      if (search?.trim()) {
        const q = search.trim().toLowerCase()
        records = records.filter(
          (record) =>
            record.name.toLowerCase().includes(q) ||
            record.content.toLowerCase().includes(q) ||
            record.type.toLowerCase().includes(q),
        )
      }

      const zone = this.database.getZoneById(zoneId)
      if (zone) {
        const cache = parseReadCache(zone.capabilitiesJson)
        const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
          dnsSuccess: true,
        })
        this.database.updateZoneReadCache(zoneId, {
          detailRefreshedAt: cache.detailRefreshedAt ?? new Date().toISOString(),
          capabilities,
        })
      }

      this.connectionService.touchMcpSuccess()
      return { records, total: records.length }
    } catch (error) {
      const status = (error as { normalized?: { httpStatus?: number } }).normalized?.httpStatus
      const zone = this.database.getZoneById(zoneId)
      if (zone && status === 403) {
        const cache = parseReadCache(zone.capabilitiesJson)
        const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
          dnsSuccess: false,
          dnsStatus: 403,
        })
        this.database.updateZoneReadCache(zoneId, {
          detailRefreshedAt: cache.detailRefreshedAt ?? new Date().toISOString(),
          capabilities,
        })
      }
      throw error
    }
  }

  getCacheStatus(zoneId: string): CacheStatus {
    const overview = this.getOverview(zoneId)
    const caps = overview.capabilities?.devModeRead ?? 'unknown'
    return {
      developmentMode: overview.developmentMode,
      readState: caps,
    }
  }

  getSecurityStatus(zoneId: string): SecurityStatus {
    const overview = this.getOverview(zoneId)
    const caps = overview.capabilities?.securityRead ?? 'unknown'
    return {
      securityLevel: overview.securityLevel,
      underAttackMode: overview.underAttackMode,
      readState: caps,
    }
  }

  async listWafRules(zoneId: string): Promise<WafListResult> {
    this.requireCachedZone(zoneId)
    const config = this.connectionService.getConfig()
    const token = await this.connectionService.requireToken()

    try {
      const result = await this.adapter.executeReviewed<{
        ok: true
        rules: Array<Record<string, unknown>>
      }>(config.mcpEndpoint, token, buildListWafRulesExecuteCode(zoneId))

      const rules = result.rules
        .map((row) => mapWafRule(row))
        .filter((row): row is NonNullable<typeof row> => row !== null)

      const zone = this.database.getZoneById(zoneId)
      if (zone) {
        const cache = parseReadCache(zone.capabilitiesJson)
        const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
          wafSuccess: true,
        })
        this.database.updateZoneReadCache(zoneId, {
          detailRefreshedAt: cache.detailRefreshedAt ?? new Date().toISOString(),
          capabilities,
        })
      }

      this.connectionService.touchMcpSuccess()
      return { rules, total: rules.length, readState: 'available' }
    } catch (error) {
      const status = (error as { normalized?: { httpStatus?: number } }).normalized?.httpStatus
      const readState = status === 403 ? 'permission_missing' : 'unavailable'
      const zone = this.database.getZoneById(zoneId)
      if (zone && status === 403) {
        const cache = parseReadCache(zone.capabilitiesJson)
        const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
          wafSuccess: false,
          wafStatus: 403,
        })
        this.database.updateZoneReadCache(zoneId, {
          detailRefreshedAt: cache.detailRefreshedAt ?? new Date().toISOString(),
          capabilities,
        })
      }
      if (status === 403) {
        return { rules: [], total: 0, readState }
      }
      throw error
    }
  }
}

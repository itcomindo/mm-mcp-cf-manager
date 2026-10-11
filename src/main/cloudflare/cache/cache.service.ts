import type { WriteActionResult } from '@shared/schemas/write-actions.schema'
import type { WriteInvokeContext } from '@shared/types/write-context'
import type { CloudflareMcpAdapter } from '../../mcp/cloudflare-mcp.adapter'
import {
  buildPurgeEverythingExecuteCode,
  buildSetDevelopmentModeExecuteCode,
} from '../../mcp/safe-execute'
import type { ConnectionService } from '../../services/connection.service'
import type { ZoneReadService } from '../zones/zone-read.service'
import { readZoneCapabilities } from '../zone-capabilities.util'
import type { WriteActionRunner } from '../write-action.runner'
import type { DatabaseService } from '../../persistence/database.service'
import { CapabilityService } from '../capability.service'

export class CacheService {
  private capabilityService = new CapabilityService()

  constructor(
    private database: DatabaseService,
    private connectionService: ConnectionService,
    private adapter: CloudflareMcpAdapter,
    private writeRunner: WriteActionRunner,
    private zoneReadService: ZoneReadService,
  ) {}

  async purgeEverything(zoneId: string, ctx?: WriteInvokeContext): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, zoneId)
    return this.writeRunner.run({
      zoneId,
      scope: 'cache',
      capabilityKey: 'cachePurge',
      capabilityState: caps.cachePurge,
      action: 'cache.purge_everything',
      target: zoneId,
      activitySource: ctx?.activitySource,
      taskId: ctx?.taskId,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed<{ purged: boolean }>(
          config.mcpEndpoint,
          token,
          buildPurgeEverythingExecuteCode(zoneId),
        )
      },
      onSuccess: () => {
        const zone = this.database.getZoneById(zoneId)
        if (zone?.capabilitiesJson) {
          try {
            const cache = JSON.parse(zone.capabilitiesJson) as { capabilities?: Record<string, string> }
            const capabilities = { ...(cache.capabilities ?? {}), cachePurge: 'available' as const }
            this.database.updateZoneReadCache(zoneId, {
              detailRefreshedAt: new Date().toISOString(),
              capabilities,
            })
          } catch {
            /* ignore cache parse errors */
          }
        }
        void this.zoneReadService.refreshZone(zoneId).catch(() => undefined)
      },
    })
  }

  async setDevelopmentMode(
    zoneId: string,
    enabled: boolean,
    ctx?: WriteInvokeContext,
  ): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, zoneId)
    const overview = this.zoneReadService.getOverview(zoneId)
    const previous = overview.developmentMode === null ? 'unknown' : overview.developmentMode ? 'on' : 'off'
    return this.writeRunner.run({
      zoneId,
      scope: 'cache',
      capabilityKey: 'devModeWrite',
      capabilityState: caps.devModeWrite,
      action: 'cache.development_mode',
      target: zoneId,
      previousValue: previous,
      newValue: enabled ? 'on' : 'off',
      activitySource: ctx?.activitySource,
      taskId: ctx?.taskId,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed<{ value: string }>(
          config.mcpEndpoint,
          token,
          buildSetDevelopmentModeExecuteCode(zoneId, enabled),
        )
      },
      onSuccess: () => {
        const zone = this.database.getZoneById(zoneId)
        if (zone) {
          const cache = zone.capabilitiesJson ? JSON.parse(zone.capabilitiesJson) : {}
          const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
            devSuccess: true,
          })
          this.database.updateZoneReadCache(zoneId, {
            detailRefreshedAt: new Date().toISOString(),
            capabilities,
            snapshot: { ...overview, developmentMode: enabled },
          })
        }
      },
    })
  }
}

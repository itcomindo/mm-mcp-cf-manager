import type { WriteActionResult } from '@shared/schemas/write-actions.schema'
import type { WriteInvokeContext } from '@shared/types/write-context'
import type { CloudflareMcpAdapter } from '../../mcp/cloudflare-mcp.adapter'
import { buildSetSecurityLevelExecuteCode } from '../../mcp/safe-execute'
import type { ConnectionService } from '../../services/connection.service'
import type { DatabaseService } from '../../persistence/database.service'
import { readZoneCapabilities } from '../zone-capabilities.util'
import type { WriteActionRunner } from '../write-action.runner'
import type { ZoneReadService } from '../zones/zone-read.service'
import { CapabilityService } from '../capability.service'

export class SecurityService {
  private capabilityService = new CapabilityService()

  constructor(
    private database: DatabaseService,
    private connectionService: ConnectionService,
    private adapter: CloudflareMcpAdapter,
    private writeRunner: WriteActionRunner,
    private zoneReadService: ZoneReadService,
  ) {}

  async setUnderAttackMode(
    zoneId: string,
    enabled: boolean,
    restoreLevel?: string,
    ctx?: WriteInvokeContext,
  ): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, zoneId)
    const overview = this.zoneReadService.getOverview(zoneId)
    const previous = overview.securityLevel ?? 'unknown'
    const nextLevel = enabled ? 'under_attack' : (restoreLevel ?? 'medium')

    return this.writeRunner.run({
      zoneId,
      scope: 'security',
      capabilityKey: 'securityWrite',
      capabilityState: caps.securityWrite,
      action: 'security.under_attack_mode',
      target: zoneId,
      previousValue: previous,
      newValue: nextLevel,
      activitySource: ctx?.activitySource,
      taskId: ctx?.taskId,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed<{ value: string }>(
          config.mcpEndpoint,
          token,
          buildSetSecurityLevelExecuteCode(zoneId, nextLevel),
        )
      },
      onSuccess: () => {
        const zone = this.database.getZoneById(zoneId)
        if (zone) {
          const cache = zone.capabilitiesJson ? JSON.parse(zone.capabilitiesJson) : {}
          const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
            secSuccess: true,
          })
          this.database.updateZoneReadCache(zoneId, {
            detailRefreshedAt: new Date().toISOString(),
            capabilities,
            snapshot: {
              ...overview,
              securityLevel: nextLevel,
              underAttackMode: enabled,
            },
          })
        }
      },
    })
  }
}

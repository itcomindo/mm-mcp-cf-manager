import type { WriteActionResult } from '@shared/schemas/write-actions.schema'
import type {
  CreateWafRuleInput,
  DeleteWafRuleInput,
  SetWafRuleEnabledInput,
  UpdateWafRuleInput,
} from '@shared/schemas/write-actions.schema'
import type { CloudflareMcpAdapter } from '../../mcp/cloudflare-mcp.adapter'
import {
  buildDeleteWafRuleExecuteCode,
  buildSetWafRuleEnabledExecuteCode,
  buildUpsertWafRuleExecuteCode,
} from '../../mcp/safe-execute'
import type { ConnectionService } from '../../services/connection.service'
import type { DatabaseService } from '../../persistence/database.service'
import { readZoneCapabilities } from '../zone-capabilities.util'
import type { WriteActionRunner } from '../write-action.runner'
import { CapabilityService } from '../capability.service'

export class WafWriteService {
  private capabilityService = new CapabilityService()

  constructor(
    private database: DatabaseService,
    private connectionService: ConnectionService,
    private adapter: CloudflareMcpAdapter,
    private writeRunner: WriteActionRunner,
  ) {}

  async setRuleEnabled(input: SetWafRuleEnabledInput): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, input.zoneId)
    return this.writeRunner.run({
      zoneId: input.zoneId,
      scope: 'waf',
      capabilityKey: 'wafWrite',
      capabilityState: caps.wafWrite,
      action: 'waf.set_enabled',
      target: input.ruleId,
      newValue: input.enabled ? 'enabled' : 'disabled',
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed(
          config.mcpEndpoint,
          token,
          buildSetWafRuleEnabledExecuteCode(input.zoneId, input.ruleId, input.enabled),
        )
      },
      onSuccess: () => this.touchWafWriteCapability(input.zoneId),
    })
  }

  async deleteRule(input: DeleteWafRuleInput): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, input.zoneId)
    return this.writeRunner.run({
      zoneId: input.zoneId,
      scope: 'waf',
      capabilityKey: 'wafWrite',
      capabilityState: caps.wafWrite,
      action: 'waf.delete',
      target: input.ruleId,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed(
          config.mcpEndpoint,
          token,
          buildDeleteWafRuleExecuteCode(input.zoneId, input.ruleId),
        )
      },
      onSuccess: () => this.touchWafWriteCapability(input.zoneId),
    })
  }

  async createRule(input: CreateWafRuleInput): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, input.zoneId)
    return this.writeRunner.run({
      zoneId: input.zoneId,
      scope: 'waf',
      capabilityKey: 'wafWrite',
      capabilityState: caps.wafWrite,
      action: 'waf.create',
      target: input.description,
      newValue: input.action,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed(
          config.mcpEndpoint,
          token,
          buildUpsertWafRuleExecuteCode(input.zoneId, {
            description: input.description,
            expression: input.expression,
            action: input.action,
            enabled: input.enabled,
          }),
        )
      },
      onSuccess: () => this.touchWafWriteCapability(input.zoneId),
    })
  }

  async updateRule(input: UpdateWafRuleInput): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, input.zoneId)
    return this.writeRunner.run({
      zoneId: input.zoneId,
      scope: 'waf',
      capabilityKey: 'wafWrite',
      capabilityState: caps.wafWrite,
      action: 'waf.update',
      target: input.ruleId,
      newValue: input.description,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed(
          config.mcpEndpoint,
          token,
          buildUpsertWafRuleExecuteCode(input.zoneId, {
            ruleId: input.ruleId,
            description: input.description,
            expression: input.expression,
            action: input.action,
            enabled: input.enabled,
          }),
        )
      },
      onSuccess: () => this.touchWafWriteCapability(input.zoneId),
    })
  }

  private touchWafWriteCapability(zoneId: string): void {
    const zone = this.database.getZoneById(zoneId)
    if (!zone) return
    const cache = zone.capabilitiesJson ? JSON.parse(zone.capabilitiesJson) : {}
    const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
      wafSuccess: true,
    })
    this.database.updateZoneReadCache(zoneId, {
      detailRefreshedAt: cache.detailRefreshedAt ?? new Date().toISOString(),
      capabilities,
    })
  }
}

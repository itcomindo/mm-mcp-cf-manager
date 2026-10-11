import type { WriteActionResult } from '@shared/schemas/write-actions.schema'
import type {
  CreateDnsRecordInput,
  DeleteDnsRecordInput,
  UpdateDnsRecordInput,
} from '@shared/schemas/write-actions.schema'
import type { CloudflareMcpAdapter } from '../../mcp/cloudflare-mcp.adapter'
import {
  buildCreateDnsRecordExecuteCode,
  buildDeleteDnsRecordExecuteCode,
  buildUpdateDnsRecordExecuteCode,
} from '../../mcp/safe-execute'
import type { ConnectionService } from '../../services/connection.service'
import type { DatabaseService } from '../../persistence/database.service'
import { readZoneCapabilities } from '../zone-capabilities.util'
import type { WriteActionRunner } from '../write-action.runner'
import { CapabilityService } from '../capability.service'

export class DnsWriteService {
  private capabilityService = new CapabilityService()

  constructor(
    private database: DatabaseService,
    private connectionService: ConnectionService,
    private adapter: CloudflareMcpAdapter,
    private writeRunner: WriteActionRunner,
  ) {}

  async createRecord(input: CreateDnsRecordInput): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, input.zoneId)
    const body: Record<string, unknown> = {
      type: input.type,
      name: input.name,
      content: input.content,
      ttl: input.ttl,
    }
    if (input.proxied !== undefined && input.type !== 'TXT') {
      body.proxied = input.proxied
    }

    return this.writeRunner.run({
      zoneId: input.zoneId,
      scope: 'dns',
      capabilityKey: 'dnsWrite',
      capabilityState: caps.dnsWrite,
      action: 'dns.create',
      target: input.name,
      newValue: `${input.type} ${input.content}`,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed(
          config.mcpEndpoint,
          token,
          buildCreateDnsRecordExecuteCode(input.zoneId, body),
        )
      },
      onSuccess: () => this.touchDnsWriteCapability(input.zoneId),
    })
  }

  async updateRecord(input: UpdateDnsRecordInput): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, input.zoneId)
    const body: Record<string, unknown> = {
      type: input.type,
      name: input.name,
      content: input.content,
      ttl: input.ttl,
    }
    if (input.proxied !== undefined && input.type !== 'TXT') {
      body.proxied = input.proxied
    }

    return this.writeRunner.run({
      zoneId: input.zoneId,
      scope: 'dns',
      capabilityKey: 'dnsWrite',
      capabilityState: caps.dnsWrite,
      action: 'dns.update',
      target: input.recordId,
      newValue: `${input.type} ${input.name}`,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed(
          config.mcpEndpoint,
          token,
          buildUpdateDnsRecordExecuteCode(input.zoneId, input.recordId, body),
        )
      },
      onSuccess: () => this.touchDnsWriteCapability(input.zoneId),
    })
  }

  async deleteRecord(input: DeleteDnsRecordInput): Promise<WriteActionResult> {
    const caps = readZoneCapabilities(this.database, input.zoneId)
    return this.writeRunner.run({
      zoneId: input.zoneId,
      scope: 'dns',
      capabilityKey: 'dnsWrite',
      capabilityState: caps.dnsWrite,
      action: 'dns.delete',
      target: input.recordId,
      execute: async () => {
        const config = this.connectionService.getConfig()
        const token = await this.connectionService.requireToken()
        await this.adapter.executeReviewed(
          config.mcpEndpoint,
          token,
          buildDeleteDnsRecordExecuteCode(input.zoneId, input.recordId),
        )
      },
      onSuccess: () => this.touchDnsWriteCapability(input.zoneId),
    })
  }

  private touchDnsWriteCapability(zoneId: string): void {
    const zone = this.database.getZoneById(zoneId)
    if (!zone) return
    const cache = zone.capabilitiesJson ? JSON.parse(zone.capabilitiesJson) : {}
    const capabilities = this.capabilityService.mergeFromProbes(cache.capabilities ?? {}, {
      dnsSuccess: true,
    })
    this.database.updateZoneReadCache(zoneId, {
      detailRefreshedAt: cache.detailRefreshedAt ?? new Date().toISOString(),
      capabilities,
    })
  }
}

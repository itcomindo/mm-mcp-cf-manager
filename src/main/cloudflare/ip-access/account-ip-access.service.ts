import { detectIpAccessTarget } from '@shared/ip-access/validate-ip'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import type { CapabilityState } from '@shared/schemas/capabilities.schema'
import type {
  CreateIpAccessRuleInput,
  DeleteIpAccessRuleInput,
  IpAccessListResult,
} from '@shared/schemas/ip-access.schema'
import type { WriteActionResult } from '@shared/schemas/write-actions.schema'
import type { CloudflareMcpAdapter } from '../../mcp/cloudflare-mcp.adapter'
import {
  buildCreateAccountIpAccessRuleExecuteCode,
  buildDeleteAccountIpAccessRuleExecuteCode,
} from '../../mcp/safe-execute'
import type { ConnectionService } from '../../services/connection.service'
import type { WriteActionRunner } from '../write-action.runner'

function isPermissionError(error: unknown): boolean {
  return (
    (error as { normalized?: { code?: string } }).normalized?.code ===
    APP_ERROR_CODES.AUTH_PERMISSION_MISSING
  )
}

export class AccountIpAccessService {
  constructor(
    private connectionService: ConnectionService,
    private adapter: CloudflareMcpAdapter,
    private writeRunner: WriteActionRunner,
  ) {}

  async listAccounts(): Promise<{ accountIds: string[] }> {
    const config = this.connectionService.getConfig()
    const token = await this.connectionService.requireToken()
    const accountIds = await this.adapter.listAccountIds(config.mcpEndpoint, token)
    return { accountIds }
  }

  async listRules(input: {
    accountId?: string
    mode?: 'whitelist' | 'all'
  }): Promise<IpAccessListResult> {
    const config = this.connectionService.getConfig()
    const token = await this.connectionService.requireToken()
    const accountId = await this.resolveAccountId(input.accountId)
    const mode = input.mode ?? 'whitelist'

    try {
      const { rules, total } = await this.adapter.listAccountIpAccessRules(
        config.mcpEndpoint,
        token,
        accountId,
        mode,
      )
      this.connectionService.patchAccountIpAccessProbes({
        accountIpAccessRead: 'available',
        accountIpAccessWrite:
          this.connectionService.getState().accountIpAccessWrite === 'permission_missing'
            ? 'permission_missing'
            : 'available',
      })
      this.connectionService.touchMcpSuccess()
      return { accountId, rules, total }
    } catch (error) {
      if (isPermissionError(error)) {
        this.connectionService.patchAccountIpAccessProbes({
          accountIpAccessRead: 'permission_missing',
        })
      }
      throw error
    }
  }

  async createWhitelistRule(input: CreateIpAccessRuleInput): Promise<WriteActionResult> {
    const target = detectIpAccessTarget(input.ip)
    if (!target) {
      throw Object.assign(new Error('Enter a valid IPv4 or IPv6 address.'), {
        code: APP_ERROR_CODES.VALIDATION_FAILED,
      })
    }

    const accountId = await this.resolveAccountId(input.accountId)
    const writeState = this.connectionService.getState().accountIpAccessWrite

    try {
      return await this.writeRunner.runAccount({
        accountId,
        writeState,
        action: 'ip_access.create',
        target: input.ip.trim(),
        newValue: 'whitelist',
        execute: async () => {
          const config = this.connectionService.getConfig()
          const token = await this.connectionService.requireToken()
          await this.adapter.executeReviewed(
            config.mcpEndpoint,
            token,
            buildCreateAccountIpAccessRuleExecuteCode(accountId, {
              target,
              value: input.ip.trim(),
              mode: 'whitelist',
              notes: input.notes,
            }),
          )
        },
        onSuccess: () => {
          this.connectionService.patchAccountIpAccessProbes({ accountIpAccessWrite: 'available' })
        },
      })
    } catch (error) {
      if (isPermissionError(error)) {
        this.connectionService.patchAccountIpAccessProbes({
          accountIpAccessWrite: 'permission_missing',
        })
      }
      throw error
    }
  }

  async deleteRule(input: DeleteIpAccessRuleInput): Promise<WriteActionResult> {
    const accountId = await this.resolveAccountId(input.accountId)
    const writeState = this.connectionService.getState().accountIpAccessWrite

    try {
      return await this.writeRunner.runAccount({
        accountId,
        writeState,
        action: 'ip_access.delete',
        target: input.ruleId,
        execute: async () => {
          const config = this.connectionService.getConfig()
          const token = await this.connectionService.requireToken()
          await this.adapter.executeReviewed(
            config.mcpEndpoint,
            token,
            buildDeleteAccountIpAccessRuleExecuteCode(accountId, input.ruleId),
          )
        },
        onSuccess: () => {
          this.connectionService.patchAccountIpAccessProbes({ accountIpAccessWrite: 'available' })
        },
      })
    } catch (error) {
      if (isPermissionError(error)) {
        this.connectionService.patchAccountIpAccessProbes({
          accountIpAccessWrite: 'permission_missing',
        })
      }
      throw error
    }
  }

  getWriteState(): CapabilityState {
    return this.connectionService.getState().accountIpAccessWrite
  }

  private async resolveAccountId(accountId?: string): Promise<string> {
    if (accountId) return accountId
    const config = this.connectionService.getConfig()
    const token = await this.connectionService.requireToken()
    const ids = await this.adapter.listAccountIds(config.mcpEndpoint, token)
    if (ids.length === 0) {
      throw Object.assign(
        new Error('No Cloudflare account found for this token. Sync zones or check token scope.'),
        { code: APP_ERROR_CODES.VALIDATION_FAILED },
      )
    }
    if (ids.length > 1) {
      throw Object.assign(new Error('Select an account before managing IP access rules.'), {
        code: APP_ERROR_CODES.VALIDATION_FAILED,
      })
    }
    return ids[0]!
  }
}

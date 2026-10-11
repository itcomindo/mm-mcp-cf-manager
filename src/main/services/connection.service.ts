import {
  CONNECTION_CONFIG_KEY,
  CONNECTION_STATE_KEY,
  DEFAULT_MCP_ENDPOINT,
} from '@shared/constants/mcp'
import type { CapabilityState } from '@shared/schemas/capabilities.schema'
import {
  connectionConfigSchema,
  connectionStateSchema,
  type ConnectionConfig,
  type ConnectionState,
  type ConnectionStatus,
  DEFAULT_CONNECTION_CONFIG,
  DEFAULT_CONNECTION_STATE,
} from '@shared/schemas/connection.schema'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import type { CloudflareMcpAdapter } from '../mcp/cloudflare-mcp.adapter'
import { permissionMessageForOperation } from '../mcp/mcp-error-normalizer'
import type { DatabaseService } from '../persistence/database.service'
import type { CredentialService } from '../security/credential.service'

export class ConnectionService {
  constructor(
    private database: DatabaseService,
    private credentials: CredentialService,
    private adapter: CloudflareMcpAdapter,
  ) {}

  getConfig(): ConnectionConfig {
    return this.database.getJsonSetting(CONNECTION_CONFIG_KEY, DEFAULT_CONNECTION_CONFIG, (value) =>
      connectionConfigSchema.parse(value),
    )
  }

  getState(): ConnectionState {
    return this.database.getJsonSetting(CONNECTION_STATE_KEY, DEFAULT_CONNECTION_STATE, (value) =>
      connectionStateSchema.parse(value),
    )
  }

  private saveState(state: ConnectionState): ConnectionState {
    const validated = connectionStateSchema.parse(state)
    this.database.setJsonSetting(CONNECTION_STATE_KEY, validated)
    return validated
  }

  getPublicStatus(): ConnectionStatus {
    const config = this.getConfig()
    const state = this.getState()
    const hasStoredToken = this.credentials.hasToken()
    return {
      ...state,
      mcpEndpoint: config.mcpEndpoint,
      hasStoredToken,
      tokenConfigured: hasStoredToken,
    }
  }

  async saveConnection(input: { mcpEndpoint: string; apiToken?: string }): Promise<ConnectionStatus> {
    const config = connectionConfigSchema.parse({ mcpEndpoint: input.mcpEndpoint })
    this.database.setJsonSetting(CONNECTION_CONFIG_KEY, config)

    if (input.apiToken) {
      if (!this.credentials.isEncryptionAvailable()) {
        throw Object.assign(new Error('OS encryption is unavailable.'), {
          code: APP_ERROR_CODES.ENCRYPTION_UNAVAILABLE,
        })
      }
      await this.credentials.saveToken(input.apiToken)
    }

    return this.getPublicStatus()
  }

  async requireToken(): Promise<string> {
    if (!this.credentials.hasToken()) {
      throw Object.assign(new Error('Save an API token before connecting.'), {
        code: APP_ERROR_CODES.AUTH_INVALID,
      })
    }
    return this.credentials.revealToken()
  }

  async testConnection(): Promise<ConnectionStatus> {
    const config = this.getConfig()
    const token = await this.requireToken()
    const now = new Date().toISOString()

    try {
      const identityPatch = await this.adapter.whoami(config.mcpEndpoint, token)
      const next = this.saveState({
        ...this.getState(),
        ...identityPatch,
        lastSuccessfulMcpRequestAt: now,
      })
      return { ...next, mcpEndpoint: config.mcpEndpoint, hasStoredToken: true, tokenConfigured: true }
    } catch (error) {
      const message =
        (error as { normalized?: { code?: string } }).normalized?.code ===
        APP_ERROR_CODES.AUTH_PERMISSION_MISSING
          ? permissionMessageForOperation('whoami')
          : error instanceof Error
            ? error.message
            : 'Test connection failed.'
      throw Object.assign(new Error(message), {
        code:
          (error as { normalized?: { code?: string } }).normalized?.code ??
          APP_ERROR_CODES.CONNECTION_FAILED,
      })
    }
  }

  disconnect(): ConnectionStatus {
    this.credentials.clearToken()
    const reset = this.saveState({
      ...DEFAULT_CONNECTION_STATE,
      isConnected: false,
      zonesCount: this.getState().zonesCount,
      freeZonesCount: this.getState().freeZonesCount,
      lastZoneSyncAt: this.getState().lastZoneSyncAt,
    })
    const config = this.getConfig()
    return {
      ...reset,
      mcpEndpoint: config.mcpEndpoint ?? DEFAULT_MCP_ENDPOINT,
      hasStoredToken: false,
      tokenConfigured: false,
    }
  }

  updateZoneCounts(zonesCount: number, freeZonesCount: number, lastZoneSyncAt: string): ConnectionState {
    return this.saveState({
      ...this.getState(),
      zonesCount,
      freeZonesCount,
      lastZoneSyncAt,
      isConnected: true,
    })
  }

  touchMcpSuccess(): void {
    this.saveState({
      ...this.getState(),
      lastSuccessfulMcpRequestAt: new Date().toISOString(),
    })
  }

  patchAccountIpAccessProbes(partial: {
    accountIpAccessRead?: CapabilityState
    accountIpAccessWrite?: CapabilityState
  }): ConnectionState {
    return this.saveState({
      ...this.getState(),
      ...partial,
    })
  }
}

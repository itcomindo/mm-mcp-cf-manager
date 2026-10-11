import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  MCP_CLIENT_NAME,
  MCP_CLIENT_VERSION,
  MCP_REQUEST_TIMEOUT_MS,
} from '@shared/constants/mcp'
import type { Logger } from '../logging/logger'
import { normalizeMcpError } from './mcp-error-normalizer'

export type McpCallToolParams = {
  name: string
  arguments?: Record<string, unknown>
}

export class McpClientService {
  constructor(private logger: Logger) {}

  async callTool(
    endpoint: string,
    token: string,
    params: McpCallToolParams,
  ): Promise<unknown> {
    const client = new Client({
      name: MCP_CLIENT_NAME,
      version: MCP_CLIENT_VERSION,
    })

    const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: {
        signal: AbortSignal.timeout(MCP_REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    try {
      await client.connect(transport)
      const result = await client.callTool({
        name: params.name,
        arguments: params.arguments ?? {},
      })
      this.logger.debug('MCP tool call completed', { tool: params.name })
      return result
    } catch (error) {
      const normalized = normalizeMcpError(error)
      this.logger.warn('MCP tool call failed', {
        tool: params.name,
        code: normalized.code,
      })
      throw Object.assign(new Error(normalized.message), { normalized })
    } finally {
      try {
        await transport.close()
      } catch {
        /* ignore close errors */
      }
    }
  }
}

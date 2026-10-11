import { z } from 'zod'
import { DEFAULT_MCP_ENDPOINT } from '../constants/mcp'
import { capabilityStateSchema } from './capabilities.schema'

export const connectionConfigSchema = z.object({
  mcpEndpoint: z.string().url().default(DEFAULT_MCP_ENDPOINT),
})

export const identityTypeSchema = z.enum(['user', 'account', 'unknown'])

export const connectionStateSchema = z.object({
  isConnected: z.boolean().default(false),
  identityType: identityTypeSchema.default('unknown'),
  identityId: z.string().nullable().default(null),
  identityLabel: z.string().nullable().default(null),
  zonesCount: z.number().int().min(0).default(0),
  freeZonesCount: z.number().int().min(0).default(0),
  lastZoneSyncAt: z.string().nullable().default(null),
  lastSuccessfulMcpRequestAt: z.string().nullable().default(null),
  accountIpAccessRead: capabilityStateSchema.default('unknown'),
  accountIpAccessWrite: capabilityStateSchema.default('unknown'),
})

export const saveConnectionSchema = z.object({
  mcpEndpoint: z.string().url(),
  apiToken: z.string().min(1).optional(),
})

export const connectionStatusSchema = connectionStateSchema.extend({
  mcpEndpoint: z.string().url(),
  hasStoredToken: z.boolean(),
  tokenConfigured: z.boolean(),
})

export const whoamiIdentitySchema = z
  .object({
    type: z.string().optional(),
    identityType: z.string().optional(),
    id: z.string().optional(),
    identityId: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    account: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),
    user: z
      .object({
        id: z.string().optional(),
        email: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

export type ConnectionConfig = z.infer<typeof connectionConfigSchema>
export type ConnectionState = z.infer<typeof connectionStateSchema>
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = connectionConfigSchema.parse({})
export const DEFAULT_CONNECTION_STATE: ConnectionState = connectionStateSchema.parse({})

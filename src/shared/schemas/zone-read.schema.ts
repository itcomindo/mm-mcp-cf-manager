import { z } from 'zod'
import { zoneCapabilitiesSchema } from './capabilities.schema'

export const zoneIdParamSchema = z.object({
  zoneId: z.string().min(1),
})

export const dnsListQuerySchema = z.object({
  zoneId: z.string().min(1),
  search: z.string().optional(),
})

export const zoneOverviewSchema = z.object({
  zoneId: z.string(),
  domain: z.string(),
  accountId: z.string().nullable(),
  status: z.string().nullable(),
  planName: z.string().nullable(),
  developmentMode: z.boolean().nullable(),
  securityLevel: z.string().nullable(),
  underAttackMode: z.boolean().nullable(),
  sslMode: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  detailRefreshedAt: z.string().nullable(),
  capabilities: zoneCapabilitiesSchema.optional(),
})

export const dnsRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  content: z.string(),
  proxied: z.boolean().nullable(),
  ttl: z.number().nullable(),
  modifiedOn: z.string().nullable(),
})

export const dnsListResultSchema = z.object({
  records: z.array(dnsRecordSchema),
  total: z.number().int().min(0),
})

export const cacheStatusSchema = z.object({
  developmentMode: z.boolean().nullable(),
  readState: z.string(),
})

export const securityStatusSchema = z.object({
  securityLevel: z.string().nullable(),
  underAttackMode: z.boolean().nullable(),
  readState: z.string(),
})

export const wafRuleSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  expression: z.string().nullable(),
  action: z.string().nullable(),
  enabled: z.boolean().nullable(),
})

export const wafListResultSchema = z.object({
  rules: z.array(wafRuleSchema),
  total: z.number().int().min(0),
  readState: z.string(),
})

export type ZoneOverview = z.infer<typeof zoneOverviewSchema>
export type DnsRecord = z.infer<typeof dnsRecordSchema>
export type DnsListResult = z.infer<typeof dnsListResultSchema>
export type CacheStatus = z.infer<typeof cacheStatusSchema>
export type SecurityStatus = z.infer<typeof securityStatusSchema>
export type WafRule = z.infer<typeof wafRuleSchema>
export type WafListResult = z.infer<typeof wafListResultSchema>

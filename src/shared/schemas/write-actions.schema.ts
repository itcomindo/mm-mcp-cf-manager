import { z } from 'zod'
import { zoneIdParamSchema } from './zone-read.schema'

export const purgeEverythingSchema = zoneIdParamSchema

export const setDevelopmentModeSchema = z.object({
  zoneId: z.string().min(1),
  enabled: z.boolean(),
})

export const setUnderAttackModeSchema = z.object({
  zoneId: z.string().min(1),
  enabled: z.boolean(),
  restoreLevel: z.string().min(1).optional(),
})

const dnsRecordTypeSchema = z.enum(['A', 'AAAA', 'CNAME', 'TXT'])

export const createDnsRecordSchema = z.object({
  zoneId: z.string().min(1),
  type: dnsRecordTypeSchema,
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(4096),
  ttl: z.number().int().min(1).max(86400).default(1),
  proxied: z.boolean().optional(),
})

export const updateDnsRecordSchema = z.object({
  zoneId: z.string().min(1),
  recordId: z.string().min(1),
  type: dnsRecordTypeSchema,
  name: z.string().min(1).max(255),
  content: z.string().min(1).max(4096),
  ttl: z.number().int().min(1).max(86400),
  proxied: z.boolean().optional(),
})

export const deleteDnsRecordSchema = z.object({
  zoneId: z.string().min(1),
  recordId: z.string().min(1),
})

export const setWafRuleEnabledSchema = z.object({
  zoneId: z.string().min(1),
  ruleId: z.string().min(1),
  enabled: z.boolean(),
})

export const deleteWafRuleSchema = z.object({
  zoneId: z.string().min(1),
  ruleId: z.string().min(1),
})

export const createWafRuleSchema = z.object({
  zoneId: z.string().min(1),
  description: z.string().min(1).max(256),
  expression: z.string().min(1).max(4096),
  action: z.enum(['block', 'challenge', 'js_challenge', 'managed_challenge', 'log', 'skip']),
  enabled: z.boolean().default(true),
})

export const updateWafRuleSchema = z.object({
  zoneId: z.string().min(1),
  ruleId: z.string().min(1),
  description: z.string().min(1).max(256),
  expression: z.string().min(1).max(4096),
  action: z.enum(['block', 'challenge', 'js_challenge', 'managed_challenge', 'log', 'skip']),
  enabled: z.boolean(),
})

export const writeActionResultSchema = z.object({
  dryRun: z.boolean(),
  message: z.string().optional(),
})

export type WriteActionResult = z.infer<typeof writeActionResultSchema>
export type CreateDnsRecordInput = z.infer<typeof createDnsRecordSchema>
export type UpdateDnsRecordInput = z.infer<typeof updateDnsRecordSchema>
export type DeleteDnsRecordInput = z.infer<typeof deleteDnsRecordSchema>
export type SetWafRuleEnabledInput = z.infer<typeof setWafRuleEnabledSchema>
export type DeleteWafRuleInput = z.infer<typeof deleteWafRuleSchema>
export type CreateWafRuleInput = z.infer<typeof createWafRuleSchema>
export type UpdateWafRuleInput = z.infer<typeof updateWafRuleSchema>

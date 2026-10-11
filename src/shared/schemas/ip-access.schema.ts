import { z } from 'zod'
import { isValidIpAccessAddress } from '../ip-access/validate-ip'

export const ipAccessRuleSchema = z.object({
  id: z.string().min(1),
  mode: z.string(),
  configurationTarget: z.string(),
  configurationValue: z.string(),
  notes: z.string().nullable(),
  createdOn: z.string().nullable(),
  modifiedOn: z.string().nullable(),
  scopeType: z.string().nullable(),
})

export const ipAccessListQuerySchema = z.object({
  accountId: z.string().min(1).optional(),
  mode: z.enum(['whitelist', 'all']).default('whitelist'),
})

export const ipAccessListResultSchema = z.object({
  accountId: z.string(),
  rules: z.array(ipAccessRuleSchema),
  total: z.number().int().min(0),
})

export const createIpAccessRuleSchema = z.object({
  accountId: z.string().min(1).optional(),
  ip: z
    .string()
    .min(1)
    .refine((value) => isValidIpAccessAddress(value), {
      message: 'Enter a valid IPv4 or IPv6 address.',
    }),
  notes: z.string().max(500).optional(),
})

export const deleteIpAccessRuleSchema = z.object({
  accountId: z.string().min(1).optional(),
  ruleId: z.string().min(1),
})

export const ipAccessAccountsResultSchema = z.object({
  accountIds: z.array(z.string()),
})

export type IpAccessRule = z.infer<typeof ipAccessRuleSchema>
export type IpAccessListResult = z.infer<typeof ipAccessListResultSchema>
export type IpAccessAccountsResult = z.infer<typeof ipAccessAccountsResultSchema>
export type CreateIpAccessRuleInput = z.infer<typeof createIpAccessRuleSchema>
export type DeleteIpAccessRuleInput = z.infer<typeof deleteIpAccessRuleSchema>

import { z } from 'zod'

export const zoneSummarySchema = z.object({
  zoneId: z.string().min(1),
  accountId: z.string().nullable(),
  domain: z.string().min(1),
  status: z.string().nullable(),
  planName: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  detailRefreshedAt: z.string().nullable(),
  developmentMode: z.boolean().nullable(),
  underAttackMode: z.boolean().nullable(),
})

export const zoneListResultSchema = z.object({
  zones: z.array(zoneSummarySchema),
  total: z.number().int().min(0),
})

export type ZoneSummary = z.infer<typeof zoneSummarySchema>
export type ZoneListResult = z.infer<typeof zoneListResultSchema>

export const syncZonesResultSchema = z.object({
  syncedCount: z.number().int().min(0),
  freeZonesCount: z.number().int().min(0),
  syncedAt: z.string(),
})

export type SyncZonesResult = z.infer<typeof syncZonesResultSchema>

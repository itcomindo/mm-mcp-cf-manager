import { z } from 'zod'

export const activityStatusSchema = z.enum(['success', 'failed', 'dry_run'])
export const activitySourceSchema = z.enum(['single', 'bulk'])

export const activityEntrySchema = z.object({
  id: z.number().int(),
  zoneId: z.string(),
  domain: z.string(),
  action: z.string(),
  target: z.string().nullable(),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  status: activityStatusSchema,
  source: activitySourceSchema,
  taskId: z.string().nullable(),
  errorSummary: z.string().nullable(),
  createdAt: z.string(),
})

export const activityListResultSchema = z.object({
  entries: z.array(activityEntrySchema),
})

export const activityListQuerySchema = z.object({
  zoneId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional(),
})

export type ActivityStatus = z.infer<typeof activityStatusSchema>
export type ActivityEntry = z.infer<typeof activityEntrySchema>
export type ActivityListResult = z.infer<typeof activityListResultSchema>

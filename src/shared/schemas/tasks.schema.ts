import { z } from 'zod'

export const bulkActionKindSchema = z.enum([
  'cache.purge_everything',
  'cache.development_mode_on',
  'cache.development_mode_off',
  'security.under_attack_on',
  'security.under_attack_off',
  'zones.refresh_detail',
])

export const taskStateSchema = z.enum(['pending', 'running', 'completed', 'cancelled'])
export const taskItemStateSchema = z.enum([
  'queued',
  'running',
  'waiting',
  'success',
  'failed',
  'cancelled',
])

export const bulkPreviewQuerySchema = z.object({
  action: bulkActionKindSchema,
  zoneIds: z.array(z.string().min(1)).min(1),
})

export const bulkCreateTaskSchema = z.object({
  action: bulkActionKindSchema,
  zoneIds: z.array(z.string().min(1)).min(1),
})

export const taskIdParamSchema = z.object({
  taskId: z.string().min(1),
})

export const zoneEligibilitySchema = z.enum([
  'eligible',
  'permission_missing',
  'plan_restricted',
  'unavailable',
  'unknown',
])

export const bulkPreviewZoneSchema = z.object({
  zoneId: z.string(),
  domain: z.string(),
  eligibility: zoneEligibilitySchema,
})

export const bulkPreviewResultSchema = z.object({
  action: bulkActionKindSchema,
  actionLabel: z.string(),
  zones: z.array(bulkPreviewZoneSchema),
  eligible: z.number().int().min(0),
  unsupported: z.number().int().min(0),
  permissionMissing: z.number().int().min(0),
  total: z.number().int().min(0),
})

export const taskItemSchema = z.object({
  id: z.number().int(),
  taskId: z.string(),
  zoneId: z.string(),
  domain: z.string(),
  action: z.string(),
  resource: z.string().nullable(),
  state: taskItemStateSchema,
  attempts: z.number().int().min(0),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
})

export const taskSummarySchema = z.object({
  id: z.string(),
  kind: z.string(),
  source: z.string(),
  state: taskStateSchema,
  selectedCount: z.number().int().min(0),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  successCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  runningCount: z.number().int().min(0),
  queuedCount: z.number().int().min(0),
  cancelledCount: z.number().int().min(0),
})

export const taskDetailSchema = taskSummarySchema.extend({
  items: z.array(taskItemSchema),
})

export const activeTasksResultSchema = z.object({
  tasks: z.array(taskSummarySchema),
  activeCount: z.number().int().min(0),
})

export type BulkActionKind = z.infer<typeof bulkActionKindSchema>
export type BulkPreviewResult = z.infer<typeof bulkPreviewResultSchema>
export type TaskState = z.infer<typeof taskStateSchema>
export type TaskItemState = z.infer<typeof taskItemStateSchema>
export type TaskItem = z.infer<typeof taskItemSchema>
export type TaskDetail = z.infer<typeof taskDetailSchema>
export type TaskSummary = z.infer<typeof taskSummarySchema>
export type ActiveTasksResult = z.infer<typeof activeTasksResultSchema>

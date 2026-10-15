import { z } from 'zod'

export const adminDataFieldTypeSchema = z.enum(['text', 'textarea'])

export const adminDataFieldSchema = z.object({
  fieldId: z.string().min(1),
  label: z.string().min(1).max(200),
  fieldType: adminDataFieldTypeSchema,
  sortOrder: z.number().int().min(0),
  createdAt: z.string(),
})

export const adminDataListFieldsResultSchema = z.object({
  fields: z.array(adminDataFieldSchema),
})

export const createAdminDataFieldSchema = z.object({
  label: z.string().min(1).max(200),
  fieldType: adminDataFieldTypeSchema,
})

export const updateAdminDataFieldSchema = z.object({
  fieldId: z.string().min(1),
  label: z.string().min(1).max(200).optional(),
})

export const deleteAdminDataFieldSchema = z.object({
  fieldId: z.string().min(1),
})

export const zoneIdParamAdminSchema = z.object({
  zoneId: z.string().min(1),
})

export const getZoneAdminValuesResultSchema = z.object({
  zoneId: z.string(),
  values: z.record(z.string(), z.string()),
})

export const saveZoneAdminValuesSchema = z.object({
  zoneId: z.string().min(1),
  values: z.record(z.string(), z.string()),
})

export const adminDataPopoverItemSchema = z.object({
  fieldId: z.string(),
  label: z.string(),
  fieldType: adminDataFieldTypeSchema,
  value: z.string(),
})

export const adminDataPopoverResultSchema = z.object({
  zoneId: z.string(),
  domain: z.string(),
  items: z.array(adminDataPopoverItemSchema),
})

export type AdminDataFieldType = z.infer<typeof adminDataFieldTypeSchema>
export type AdminDataField = z.infer<typeof adminDataFieldSchema>
export type AdminDataPopoverItem = z.infer<typeof adminDataPopoverItemSchema>
export type AdminDataPopoverResult = z.infer<typeof adminDataPopoverResultSchema>

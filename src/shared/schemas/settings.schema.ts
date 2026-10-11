import { z } from 'zod'

export const SIDEBAR_WIDTH_MIN_PX = 288
export const SIDEBAR_WIDTH_MAX_PX = 560
export const SIDEBAR_WIDTH_DEFAULT_PX = 288

export const themePreferenceSchema = z.enum(['system', 'light', 'dark'])
export const fontSizePreferenceSchema = z.enum(['sm', 's', 'md', 'l'])

export const appearanceSettingsSchema = z.object({
  theme: themePreferenceSchema.default('system'),
  fontSize: fontSizePreferenceSchema.default('md'),
  sidebarWidthPx: z
    .number()
    .int()
    .min(SIDEBAR_WIDTH_MIN_PX)
    .max(SIDEBAR_WIDTH_MAX_PX)
    .default(SIDEBAR_WIDTH_DEFAULT_PX),
})

export const behaviorSettingsSchema = z.object({
  bulkConcurrency: z.number().int().min(1).max(5).default(3),
  maxRetries: z.number().int().min(0).max(10).default(3),
  dryRun: z.boolean().default(false),
  confirmSingleHighImpact: z.boolean().default(true),
})

export const windowBoundsSchema = z.object({
  x: z.number().int().optional(),
  y: z.number().int().optional(),
  width: z.number().int().min(800),
  height: z.number().int().min(600),
})

export const appSettingsSchema = z.object({
  appearance: appearanceSettingsSchema,
  behavior: behaviorSettingsSchema,
  windowBounds: windowBoundsSchema.optional(),
})

export const updateAppearanceSchema = appearanceSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one appearance field is required' },
)

export const updateBehaviorSchema = behaviorSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one behavior field is required' },
)

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>
export type BehaviorSettings = z.infer<typeof behaviorSettingsSchema>
export type AppSettings = z.infer<typeof appSettingsSchema>

export const DEFAULT_APP_SETTINGS: AppSettings = appSettingsSchema.parse({
  appearance: {},
  behavior: {},
})

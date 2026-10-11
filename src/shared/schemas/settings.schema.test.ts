import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APP_SETTINGS,
  SIDEBAR_WIDTH_DEFAULT_PX,
  SIDEBAR_WIDTH_MAX_PX,
  SIDEBAR_WIDTH_MIN_PX,
  updateAppearanceSchema,
  updateBehaviorSchema,
} from './settings.schema'

describe('settings schemas', () => {
  it('provides blueprint defaults', () => {
    expect(DEFAULT_APP_SETTINGS.appearance.theme).toBe('system')
    expect(DEFAULT_APP_SETTINGS.appearance.fontSize).toBe('md')
    expect(DEFAULT_APP_SETTINGS.appearance.sidebarWidthPx).toBe(SIDEBAR_WIDTH_DEFAULT_PX)
    expect(DEFAULT_APP_SETTINGS.behavior.bulkConcurrency).toBe(3)
    expect(DEFAULT_APP_SETTINGS.behavior.dryRun).toBe(false)
  })

  it('rejects empty partial updates', () => {
    expect(updateAppearanceSchema.safeParse({}).success).toBe(false)
    expect(updateBehaviorSchema.safeParse({}).success).toBe(false)
  })

  it('validates bounded behavior fields', () => {
    expect(updateBehaviorSchema.safeParse({ bulkConcurrency: 6 }).success).toBe(false)
    expect(updateBehaviorSchema.safeParse({ bulkConcurrency: 3 }).success).toBe(true)
  })

  it('validates bounded sidebar width', () => {
    expect(updateAppearanceSchema.safeParse({ sidebarWidthPx: SIDEBAR_WIDTH_MIN_PX }).success).toBe(
      true,
    )
    expect(updateAppearanceSchema.safeParse({ sidebarWidthPx: SIDEBAR_WIDTH_MAX_PX }).success).toBe(
      true,
    )
    expect(updateAppearanceSchema.safeParse({ sidebarWidthPx: SIDEBAR_WIDTH_MIN_PX - 1 }).success).toBe(
      false,
    )
    expect(updateAppearanceSchema.safeParse({ sidebarWidthPx: SIDEBAR_WIDTH_MAX_PX + 1 }).success).toBe(
      false,
    )
  })
})

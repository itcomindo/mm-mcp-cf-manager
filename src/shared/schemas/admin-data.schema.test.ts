import { describe, expect, it } from 'vitest'
import {
  createAdminDataFieldSchema,
  saveZoneAdminValuesSchema,
} from './admin-data.schema'

describe('admin-data.schema', () => {
  it('accepts create field payload', () => {
    expect(
      createAdminDataFieldSchema.safeParse({ label: 'Registrar', fieldType: 'text' }).success,
    ).toBe(true)
  })

  it('rejects empty label', () => {
    expect(createAdminDataFieldSchema.safeParse({ label: '', fieldType: 'text' }).success).toBe(
      false,
    )
  })

  it('accepts save zone values', () => {
    expect(
      saveZoneAdminValuesSchema.safeParse({
        zoneId: 'z1',
        values: { f1: 'note' },
      }).success,
    ).toBe(true)
  })
})

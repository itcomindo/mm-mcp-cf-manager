import {
  adminDataListFieldsResultSchema,
  createAdminDataFieldSchema,
  deleteAdminDataFieldSchema,
  getZoneAdminValuesResultSchema,
  saveZoneAdminValuesSchema,
  updateAdminDataFieldSchema,
  zoneIdParamAdminSchema,
  type AdminDataField,
  type AdminDataPopoverResult,
} from '@shared/schemas/admin-data.schema'
import type { DatabaseService } from '../persistence/database.service'

export class AdminDataService {
  constructor(private database: DatabaseService) {}

  listFields(): { fields: AdminDataField[] } {
    return adminDataListFieldsResultSchema.parse({
      fields: this.database.listAdminDataFields(),
    })
  }

  createField(raw: unknown): AdminDataField {
    const parsed = createAdminDataFieldSchema.parse(raw)
    return this.database.createAdminDataField(parsed.label, parsed.fieldType)
  }

  updateField(raw: unknown): AdminDataField {
    const parsed = updateAdminDataFieldSchema.parse(raw)
    if (!parsed.label) {
      throw new Error('Nothing to update')
    }
    const updated = this.database.updateAdminDataField(parsed.fieldId, parsed.label)
    if (!updated) {
      throw new Error('Field not found')
    }
    return updated
  }

  deleteField(raw: unknown): { deleted: boolean } {
    const parsed = deleteAdminDataFieldSchema.parse(raw)
    return { deleted: this.database.deleteAdminDataField(parsed.fieldId) }
  }

  getZoneValues(raw: unknown): { zoneId: string; values: Record<string, string> } {
    const parsed = zoneIdParamAdminSchema.parse(raw)
    return getZoneAdminValuesResultSchema.parse({
      zoneId: parsed.zoneId,
      values: this.database.getZoneAdminDataValues(parsed.zoneId),
    })
  }

  saveZoneValues(raw: unknown): { zoneId: string; saved: true } {
    const parsed = saveZoneAdminValuesSchema.parse(raw)
    const knownIds = new Set(this.database.listAdminDataFields().map((f) => f.fieldId))
    const filtered: Record<string, string> = {}
    for (const [fieldId, value] of Object.entries(parsed.values)) {
      if (knownIds.has(fieldId)) {
        filtered[fieldId] = value
      }
    }
    this.database.saveZoneAdminDataValues(parsed.zoneId, filtered)
    return { zoneId: parsed.zoneId, saved: true }
  }

  getPopover(raw: unknown): AdminDataPopoverResult {
    const parsed = zoneIdParamAdminSchema.parse(raw)
    const domain = this.database.getZoneDomain(parsed.zoneId) ?? parsed.zoneId
    return {
      zoneId: parsed.zoneId,
      domain,
      items: this.database.getAdminDataPopoverItems(parsed.zoneId),
    }
  }
}

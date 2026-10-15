import { describe, expect, it } from 'vitest'
import { DatabaseService } from '../persistence/database.service'
import { AdminDataService } from './admin-data.service'
import { Logger } from '../logging/logger'

describe('AdminDataService', () => {
  it('creates fields and saves zone values for popover', () => {
    const logger = new Logger('.', 'error')
    const database = new DatabaseService(':memory:', logger)
    const service = new AdminDataService(database)

    const now = new Date().toISOString()
    database.upsertZones([
      {
        zoneId: 'zone-1',
        accountId: null,
        domain: 'example.test',
        status: 'active',
        planName: 'Free',
        lastSyncedAt: now,
        detailRefreshedAt: null,
        developmentMode: null,
        underAttackMode: null,
      },
    ])

    const field = service.createField({ label: 'Registrar', fieldType: 'text' })
    service.saveZoneValues({
      zoneId: 'zone-1',
      values: { [field.fieldId]: 'Namecheap' },
    })

    const popover = service.getPopover({ zoneId: 'zone-1' })
    expect(popover.domain).toBe('example.test')
    expect(popover.items).toHaveLength(1)
    expect(popover.items[0]?.value).toBe('Namecheap')

    service.saveZoneValues({
      zoneId: 'zone-1',
      values: { [field.fieldId]: '   ' },
    })
    const empty = service.getPopover({ zoneId: 'zone-1' })
    expect(empty.items).toHaveLength(0)
  })
})

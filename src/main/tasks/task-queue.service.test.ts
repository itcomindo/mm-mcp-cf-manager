import { describe, expect, it, vi } from 'vitest'
import { TaskQueueService } from './task-queue.service'

describe('TaskQueueService.preview', () => {
  it('counts eligible vs permission missing zones', () => {
    const database = {
      getZoneById: vi.fn((zoneId: string) => ({
        zoneId,
        domain: `${zoneId}.test`,
        capabilitiesJson: JSON.stringify({
          capabilities:
            zoneId === 'z1'
              ? { cachePurge: 'available' }
              : { cachePurge: 'permission_missing' },
        }),
      })),
    }
    const service = new TaskQueueService(
      database as never,
      { getAll: () => ({ behavior: { dryRun: false } }) } as never,
      {} as never,
      {} as never,
      {} as never,
      { error: vi.fn() } as never,
    )

    const preview = service.preview('cache.purge_everything', ['z1', 'z2'])
    expect(preview.eligible).toBe(1)
    expect(preview.permissionMissing).toBe(1)
    expect(preview.total).toBe(2)
  })

  it('marks all synced zones eligible for refresh zone detail', () => {
    const database = {
      getZoneById: vi.fn((zoneId: string) =>
        zoneId === 'missing'
          ? null
          : {
              zoneId,
              domain: `${zoneId}.test`,
              capabilitiesJson: null,
            },
      ),
    }
    const service = new TaskQueueService(
      database as never,
      { getAll: () => ({ behavior: { dryRun: false } }) } as never,
      {} as never,
      {} as never,
      {} as never,
      { error: vi.fn() } as never,
    )

    const preview = service.preview('zones.refresh_detail', ['z1', 'missing'])
    expect(preview.eligible).toBe(1)
    expect(preview.unsupported).toBe(1)
    expect(preview.permissionMissing).toBe(0)
  })
})

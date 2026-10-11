import { describe, expect, it, vi } from 'vitest'
import { WriteActionRunner } from './write-action.runner'

describe('WriteActionRunner', () => {
  it('records dry_run activity without calling execute', async () => {
    const database = {
      getZoneById: vi.fn(() => ({
        zoneId: 'zone-1',
        domain: 'example.com',
        capabilitiesJson: JSON.stringify({ capabilities: { cachePurge: 'available' } }),
      })),
    }
    const settingsService = {
      getAll: vi.fn(() => ({ behavior: { dryRun: true } })),
    }
    const connectionService = {
      requireToken: vi.fn(async () => 'token'),
      touchMcpSuccess: vi.fn(),
    }
    const locks = {
      tryAcquire: vi.fn(() => true),
      release: vi.fn(),
    }
    const activity = {
      record: vi.fn(),
    }
    const execute = vi.fn(async () => undefined)

    const runner = new WriteActionRunner(
      database as never,
      settingsService as never,
      connectionService as never,
      locks as never,
      activity as never,
    )

    const result = await runner.run({
      zoneId: 'zone-1',
      scope: 'cache',
      capabilityKey: 'cachePurge',
      capabilityState: 'available',
      action: 'cache.purge_everything',
      execute,
    })

    expect(result.dryRun).toBe(true)
    expect(execute).not.toHaveBeenCalled()
    expect(activity.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dry_run', action: 'cache.purge_everything' }),
    )
    expect(locks.release).toHaveBeenCalledWith('zone-1', 'cache')
  })
})

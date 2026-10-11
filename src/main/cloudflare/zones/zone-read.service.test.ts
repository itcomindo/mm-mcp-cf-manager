import { describe, expect, it, vi } from 'vitest'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import { ZoneReadService } from './zone-read.service'

const zoneRow = {
  zoneId: 'zone-1',
  domain: 'example.com',
  status: 'active',
  planName: 'Free Website',
  accountId: 'acc-1',
  lastSyncedAt: '2026-01-01T00:00:00Z',
  capabilitiesJson: JSON.stringify({ capabilities: { dnsRead: 'unknown' } }),
}

function createService(executeReviewed: ReturnType<typeof vi.fn>) {
  const database = {
    getZoneById: vi.fn(() => ({ ...zoneRow })),
    updateZoneReadCache: vi.fn(),
  }
  const connectionService = {
    getConfig: vi.fn(() => ({ mcpEndpoint: 'https://mcp.cloudflare.com/mcp' })),
    requireToken: vi.fn(async () => 'token'),
    touchMcpSuccess: vi.fn(),
  }
  const adapter = { executeReviewed }
  const service = new ZoneReadService(
    database as never,
    connectionService as never,
    adapter as never,
  )
  return { service, database, connectionService }
}

describe('ZoneReadService.listDns', () => {
  it('marks dnsRead permission_missing when MCP returns 403', async () => {
    const forbidden = Object.assign(new Error('Forbidden'), {
      normalized: {
        code: APP_ERROR_CODES.AUTH_PERMISSION_MISSING,
        message: 'Forbidden',
        httpStatus: 403,
      },
    })
    const executeReviewed = vi.fn(async () => {
      throw forbidden
    })
    const { service, database } = createService(executeReviewed)

    await expect(service.listDns('zone-1')).rejects.toThrow('Forbidden')
    expect(database.updateZoneReadCache).toHaveBeenCalledWith(
      'zone-1',
      expect.objectContaining({
        capabilities: expect.objectContaining({ dnsRead: 'permission_missing' }),
      }),
    )
  })
})

import { describe, expect, it, vi } from 'vitest'
import { ConnectionService } from './connection.service'
import { DEFAULT_CONNECTION_STATE } from '@shared/schemas/connection.schema'

function createMocks() {
  const store = new Map<string, unknown>()
  const database = {
    getJsonSetting: vi.fn((key: string, fallback: unknown) => {
      return store.has(key) ? store.get(key) : fallback
    }),
    setJsonSetting: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
    }),
  }
  const credentials = {
    hasToken: vi.fn(() => true),
    isEncryptionAvailable: vi.fn(() => true),
    saveToken: vi.fn(async () => undefined),
    revealToken: vi.fn(async () => 'secret-token'),
    clearToken: vi.fn(),
  }
  const adapter = {
    whoami: vi.fn(async () => ({
      isConnected: true,
      identityType: 'user' as const,
      identityId: 'user-1',
      identityLabel: 'admin@example.com',
    })),
  }
  return { database, credentials, adapter, store }
}

describe('ConnectionService', () => {
  it('testConnection updates identity and timestamp', async () => {
    const { database, credentials, adapter } = createMocks()
    const service = new ConnectionService(
      database as never,
      credentials as never,
      adapter as never,
    )

    const status = await service.testConnection()
    expect(status.isConnected).toBe(true)
    expect(status.identityLabel).toBe('admin@example.com')
    expect(status.lastSuccessfulMcpRequestAt).toBeTruthy()
    expect(adapter.whoami).toHaveBeenCalledOnce()
  })

  it('disconnect clears token and connected flag', () => {
    const { database, credentials, adapter } = createMocks()
    const service = new ConnectionService(
      database as never,
      credentials as never,
      adapter as never,
    )

    database.setJsonSetting('connection.state', {
      ...DEFAULT_CONNECTION_STATE,
      isConnected: true,
      zonesCount: 5,
    })

    const status = service.disconnect()
    expect(credentials.clearToken).toHaveBeenCalled()
    expect(status.hasStoredToken).toBe(false)
    expect(status.isConnected).toBe(false)
    expect(status.zonesCount).toBe(5)
  })
})

import { clipboard, ipcMain } from 'electron'
import { saveConnectionSchema } from '@shared/schemas/connection.schema'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import type { Logger } from '../logging/logger'
import type { ConnectionService } from '../services/connection.service'
import type { ZoneService } from '../cloudflare/zones/zone.service'
import type { CredentialService } from '../security/credential.service'
import { ipcErr, ipcOk } from './ipc-result'

export function registerConnectionHandlers(deps: {
  connectionService: ConnectionService
  zoneService: ZoneService
  credentialService: CredentialService
  logger: Logger
}): void {
  const { connectionService, zoneService, credentialService, logger } = deps

  ipcMain.handle('mmcf:connection:getStatus', () => {
    try {
      return ipcOk(connectionService.getPublicStatus())
    } catch (error) {
      logger.error('connection:getStatus failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to load connection status.')
    }
  })

  ipcMain.handle('mmcf:connection:save', async (_event, raw: unknown) => {
    const parsed = saveConnectionSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      const status = await connectionService.saveConnection(parsed.data)
      return ipcOk(status)
    } catch (error) {
      logger.error('connection:save failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.SETTINGS_WRITE_FAILED
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to save connection.')
    }
  })

  ipcMain.handle('mmcf:connection:test', async () => {
    try {
      const status = await connectionService.testConnection()
      return ipcOk(status)
    } catch (error) {
      logger.error('connection:test failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.CONNECTION_FAILED
      return ipcErr(code, error instanceof Error ? error.message : 'Test connection failed.')
    }
  })

  ipcMain.handle('mmcf:connection:disconnect', () => {
    try {
      return ipcOk(connectionService.disconnect())
    } catch (error) {
      logger.error('connection:disconnect failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to disconnect.')
    }
  })

  ipcMain.handle('mmcf:connection:revealToken', async () => {
    try {
      if (!credentialService.isEncryptionAvailable()) {
        return ipcErr(
          APP_ERROR_CODES.ENCRYPTION_UNAVAILABLE,
          'OS encryption is not available on this system.',
        )
      }
      const token = await credentialService.revealToken()
      return ipcOk({ token })
    } catch (error) {
      logger.error('connection:revealToken failed', { error })
      return ipcErr(APP_ERROR_CODES.AUTH_INVALID, 'Unable to reveal stored token.')
    }
  })

  ipcMain.handle('mmcf:connection:copyTokenToClipboard', async () => {
    try {
      if (!credentialService.isEncryptionAvailable()) {
        return ipcErr(
          APP_ERROR_CODES.ENCRYPTION_UNAVAILABLE,
          'OS encryption is not available on this system.',
        )
      }
      const token = await credentialService.revealToken()
      clipboard.writeText(token)
      return ipcOk({ copied: true as const })
    } catch (error) {
      logger.error('connection:copyTokenToClipboard failed', { error })
      return ipcErr(APP_ERROR_CODES.AUTH_INVALID, 'Unable to copy token.')
    }
  })

  ipcMain.handle('mmcf:connection:syncZones', async () => {
    try {
      const result = await zoneService.syncFromCloudflare()
      const status = connectionService.getPublicStatus()
      return ipcOk({ ...result, status })
    } catch (error) {
      logger.error('connection:syncZones failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
      return ipcErr(code, error instanceof Error ? error.message : 'Zone sync failed.')
    }
  })
}

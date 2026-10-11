import { ipcMain } from 'electron'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import type { Logger } from '../logging/logger'
import type { ZoneService } from '../cloudflare/zones/zone.service'
import { ipcErr, ipcOk } from './ipc-result'

export function registerZoneHandlers(deps: { zoneService: ZoneService; logger: Logger }): void {
  const { zoneService, logger } = deps

  ipcMain.handle('mmcf:zones:list', () => {
    try {
      return ipcOk(zoneService.listCached())
    } catch (error) {
      logger.error('zones:list failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to list zones.')
    }
  })
}

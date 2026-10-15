import { ipcMain } from 'electron'
import type { Logger } from '../logging/logger'
import type { AdminDataService } from '../services/admin-data.service'
import { ipcErr, ipcOk } from './ipc-result'

export function registerAdminDataHandlers(deps: {
  adminDataService: AdminDataService
  logger: Logger
}): void {
  const { adminDataService, logger } = deps

  ipcMain.handle('mmcf:adminData:listFields', () => {
    try {
      return ipcOk(adminDataService.listFields())
    } catch (error) {
      logger.error('adminData:listFields failed', { error })
      return ipcErr('ADMIN_DATA_READ_FAILED', 'Unable to load admin data fields.')
    }
  })

  ipcMain.handle('mmcf:adminData:createField', (_event, raw: unknown) => {
    try {
      return ipcOk(adminDataService.createField(raw))
    } catch (error) {
      logger.error('adminData:createField failed', { error })
      return ipcErr('ADMIN_DATA_WRITE_FAILED', 'Unable to create admin data field.')
    }
  })

  ipcMain.handle('mmcf:adminData:updateField', (_event, raw: unknown) => {
    try {
      return ipcOk(adminDataService.updateField(raw))
    } catch (error) {
      logger.error('adminData:updateField failed', { error })
      return ipcErr('ADMIN_DATA_WRITE_FAILED', 'Unable to update admin data field.')
    }
  })

  ipcMain.handle('mmcf:adminData:deleteField', (_event, raw: unknown) => {
    try {
      return ipcOk(adminDataService.deleteField(raw))
    } catch (error) {
      logger.error('adminData:deleteField failed', { error })
      return ipcErr('ADMIN_DATA_WRITE_FAILED', 'Unable to delete admin data field.')
    }
  })

  ipcMain.handle('mmcf:adminData:getZoneValues', (_event, raw: unknown) => {
    try {
      return ipcOk(adminDataService.getZoneValues(raw))
    } catch (error) {
      logger.error('adminData:getZoneValues failed', { error })
      return ipcErr('ADMIN_DATA_READ_FAILED', 'Unable to load zone admin data.')
    }
  })

  ipcMain.handle('mmcf:adminData:saveZoneValues', (_event, raw: unknown) => {
    try {
      return ipcOk(adminDataService.saveZoneValues(raw))
    } catch (error) {
      logger.error('adminData:saveZoneValues failed', { error })
      return ipcErr('ADMIN_DATA_WRITE_FAILED', 'Unable to save zone admin data.')
    }
  })

  ipcMain.handle('mmcf:adminData:getPopover', (_event, raw: unknown) => {
    try {
      return ipcOk(adminDataService.getPopover(raw))
    } catch (error) {
      logger.error('adminData:getPopover failed', { error })
      return ipcErr('ADMIN_DATA_READ_FAILED', 'Unable to load admin data preview.')
    }
  })
}

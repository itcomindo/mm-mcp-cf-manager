import { ipcMain, shell } from 'electron'
import { z } from 'zod'
import {
  updateAppearanceSchema,
  updateBehaviorSchema,
  windowBoundsSchema,
} from '@shared/schemas/settings.schema'
import type { Logger } from '../logging/logger'
import type { ZoneService } from '../cloudflare/zones/zone.service'
import type { ConnectionService } from '../services/connection.service'
import type { SettingsService } from '../services/settings.service'
import type { CredentialService } from '../security/credential.service'
import { registerConnectionHandlers } from './connection.handlers'
import { ipcErr, ipcOk } from './ipc-result'
import { registerZoneHandlers } from './zones.handlers'
import { registerZoneReadHandlers } from './zone-read.handlers'
import type { ActivityService } from '../cloudflare/activity.service'
import type { CacheService } from '../cloudflare/cache/cache.service'
import type { DnsWriteService } from '../cloudflare/dns/dns-write.service'
import type { SecurityService } from '../cloudflare/security/security.service'
import type { WafWriteService } from '../cloudflare/waf/waf-write.service'
import type { ZoneReadService } from '../cloudflare/zones/zone-read.service'
import type { AccountIpAccessService } from '../cloudflare/ip-access/account-ip-access.service'
import type { TaskQueueService } from '../tasks/task-queue.service'
import { registerIpAccessHandlers } from './ip-access.handlers'
import { registerWriteHandlers } from './write.handlers'
import { registerTaskHandlers } from './tasks.handlers'
import { registerAdminDataHandlers } from './admin-data.handlers'
import type { AdminDataService } from '../services/admin-data.service'

const emptySchema = z.object({})

export function registerIpcHandlers(deps: {
  settingsService: SettingsService
  adminDataService: AdminDataService
  connectionService: ConnectionService
  zoneService: ZoneService
  zoneReadService: ZoneReadService
  cacheService: CacheService
  securityService: SecurityService
  dnsWriteService: DnsWriteService
  wafWriteService: WafWriteService
  activityService: ActivityService
  taskQueueService: TaskQueueService
  accountIpAccessService: AccountIpAccessService
  credentialService: CredentialService
  userDataPath: string
  databasePath: string
  logsPath: string
  logger: Logger
  getAppVersion: () => string
}): void {
  const {
    settingsService,
    adminDataService,
    connectionService,
    zoneService,
    zoneReadService,
    cacheService,
    securityService,
    dnsWriteService,
    wafWriteService,
    activityService,
    taskQueueService,
    accountIpAccessService,
    credentialService,
    userDataPath,
    databasePath,
    logsPath,
    logger,
    getAppVersion,
  } = deps

  registerConnectionHandlers({ connectionService, zoneService, credentialService, logger })
  registerZoneHandlers({ zoneService, logger })
  registerZoneReadHandlers({ zoneReadService, logger })
  registerWriteHandlers({
    cacheService,
    securityService,
    dnsWriteService,
    wafWriteService,
    activityService,
    logger,
  })
  registerTaskHandlers({ taskQueueService, logger })
  registerIpAccessHandlers({ accountIpAccessService, logger })
  registerAdminDataHandlers({ adminDataService, logger })

  ipcMain.handle('mmcf:settings:getAll', () => {
    try {
      return ipcOk(settingsService.getAll())
    } catch (error) {
      logger.error('settings:getAll failed', { error })
      return ipcErr('SETTINGS_READ_FAILED', 'Unable to load settings.')
    }
  })

  ipcMain.handle('mmcf:settings:updateAppearance', (_event, raw: unknown) => {
    const parsed = updateAppearanceSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr('VALIDATION_FAILED', parsed.error.message)
    }
    try {
      return ipcOk(settingsService.updateAppearance(parsed.data))
    } catch (error) {
      logger.error('settings:updateAppearance failed', { error })
      return ipcErr('SETTINGS_WRITE_FAILED', 'Unable to save appearance settings.')
    }
  })

  ipcMain.handle('mmcf:settings:updateBehavior', (_event, raw: unknown) => {
    const parsed = updateBehaviorSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr('VALIDATION_FAILED', parsed.error.message)
    }
    try {
      return ipcOk(settingsService.updateBehavior(parsed.data))
    } catch (error) {
      logger.error('settings:updateBehavior failed', { error })
      return ipcErr('SETTINGS_WRITE_FAILED', 'Unable to save behavior settings.')
    }
  })

  ipcMain.handle('mmcf:settings:getPaths', () => {
    return ipcOk({ userDataPath, databasePath, logsPath })
  })

  ipcMain.handle('mmcf:settings:openUserDataFolder', async () => {
    const result = await shell.openPath(userDataPath)
    if (result) {
      return ipcErr('OPEN_PATH_FAILED', result)
    }
    return ipcOk({ opened: true })
  })

  ipcMain.handle('mmcf:settings:resetUiPreferences', () => {
    try {
      return ipcOk(settingsService.resetUiPreferences())
    } catch (error) {
      logger.error('settings:resetUiPreferences failed', { error })
      return ipcErr('SETTINGS_WRITE_FAILED', 'Unable to reset UI preferences.')
    }
  })

  ipcMain.handle('mmcf:app:getVersion', () => {
    emptySchema.parse({})
    return ipcOk({ version: getAppVersion() })
  })

  ipcMain.handle('mmcf:window:saveBounds', (_event, raw: unknown) => {
    const parsed = windowBoundsSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr('VALIDATION_FAILED', parsed.error.message)
    }
    try {
      return ipcOk(settingsService.saveWindowBounds(parsed.data))
    } catch (error) {
      logger.error('window:saveBounds failed', { error })
      return ipcErr('SETTINGS_WRITE_FAILED', 'Unable to save window bounds.')
    }
  })
}

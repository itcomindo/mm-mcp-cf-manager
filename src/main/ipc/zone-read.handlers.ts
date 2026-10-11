import { ipcMain } from 'electron'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import { dnsListQuerySchema, zoneIdParamSchema } from '@shared/schemas/zone-read.schema'
import type { Logger } from '../logging/logger'
import type { ZoneReadService } from '../cloudflare/zones/zone-read.service'
import { ipcErr, ipcOk } from './ipc-result'

export function registerZoneReadHandlers(deps: {
  zoneReadService: ZoneReadService
  logger: Logger
}): void {
  const { zoneReadService, logger } = deps

  ipcMain.handle('mmcf:zones:getOverview', (_event, raw: unknown) => {
    const parsed = zoneIdParamSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(zoneReadService.getOverview(parsed.data.zoneId))
    } catch (error) {
      logger.error('zones:getOverview failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.UNKNOWN
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to load overview.')
    }
  })

  ipcMain.handle('mmcf:zones:refresh', async (_event, raw: unknown) => {
    const parsed = zoneIdParamSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await zoneReadService.refreshZone(parsed.data.zoneId))
    } catch (error) {
      logger.error('zones:refresh failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.CONNECTION_FAILED
      return ipcErr(code, error instanceof Error ? error.message : 'Zone refresh failed.')
    }
  })

  ipcMain.handle('mmcf:dns:list', async (_event, raw: unknown) => {
    const parsed = dnsListQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await zoneReadService.listDns(parsed.data.zoneId, parsed.data.search))
    } catch (error) {
      logger.error('dns:list failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to list DNS records.')
    }
  })

  ipcMain.handle('mmcf:cache:getStatus', (_event, raw: unknown) => {
    const parsed = zoneIdParamSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(zoneReadService.getCacheStatus(parsed.data.zoneId))
    } catch (error) {
      logger.error('cache:getStatus failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, error instanceof Error ? error.message : 'Failed.')
    }
  })

  ipcMain.handle('mmcf:security:getStatus', (_event, raw: unknown) => {
    const parsed = zoneIdParamSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(zoneReadService.getSecurityStatus(parsed.data.zoneId))
    } catch (error) {
      logger.error('security:getStatus failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, error instanceof Error ? error.message : 'Failed.')
    }
  })

  ipcMain.handle('mmcf:waf:listRules', async (_event, raw: unknown) => {
    const parsed = zoneIdParamSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await zoneReadService.listWafRules(parsed.data.zoneId))
    } catch (error) {
      logger.error('waf:listRules failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to list WAF rules.')
    }
  })
}

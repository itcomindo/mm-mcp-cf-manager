import { ipcMain } from 'electron'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import { activityListQuerySchema } from '@shared/schemas/activity.schema'
import {
  createDnsRecordSchema,
  createWafRuleSchema,
  deleteDnsRecordSchema,
  deleteWafRuleSchema,
  purgeEverythingSchema,
  setDevelopmentModeSchema,
  setUnderAttackModeSchema,
  setWafRuleEnabledSchema,
  updateDnsRecordSchema,
  updateWafRuleSchema,
} from '@shared/schemas/write-actions.schema'
import type { ActivityService } from '../cloudflare/activity.service'
import type { CacheService } from '../cloudflare/cache/cache.service'
import type { DnsWriteService } from '../cloudflare/dns/dns-write.service'
import type { SecurityService } from '../cloudflare/security/security.service'
import type { WafWriteService } from '../cloudflare/waf/waf-write.service'
import type { Logger } from '../logging/logger'
import { ipcErr, ipcOk } from './ipc-result'

function writeError(error: unknown, logger: Logger, context: string) {
  logger.error(context, { error })
  const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
  return ipcErr(code, error instanceof Error ? error.message : 'Write action failed.')
}

export function registerWriteHandlers(deps: {
  cacheService: CacheService
  securityService: SecurityService
  dnsWriteService: DnsWriteService
  wafWriteService: WafWriteService
  activityService: ActivityService
  logger: Logger
}): void {
  const { cacheService, securityService, dnsWriteService, wafWriteService, activityService, logger } =
    deps

  ipcMain.handle('mmcf:cache:purgeEverything', async (_event, raw: unknown) => {
    const parsed = purgeEverythingSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await cacheService.purgeEverything(parsed.data.zoneId))
    } catch (error) {
      return writeError(error, logger, 'cache:purgeEverything failed')
    }
  })

  ipcMain.handle('mmcf:cache:setDevelopmentMode', async (_event, raw: unknown) => {
    const parsed = setDevelopmentModeSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(
        await cacheService.setDevelopmentMode(parsed.data.zoneId, parsed.data.enabled),
      )
    } catch (error) {
      return writeError(error, logger, 'cache:setDevelopmentMode failed')
    }
  })

  ipcMain.handle('mmcf:security:setUnderAttackMode', async (_event, raw: unknown) => {
    const parsed = setUnderAttackModeSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(
        await securityService.setUnderAttackMode(
          parsed.data.zoneId,
          parsed.data.enabled,
          parsed.data.restoreLevel,
        ),
      )
    } catch (error) {
      return writeError(error, logger, 'security:setUnderAttackMode failed')
    }
  })

  ipcMain.handle('mmcf:dns:create', async (_event, raw: unknown) => {
    const parsed = createDnsRecordSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await dnsWriteService.createRecord(parsed.data))
    } catch (error) {
      return writeError(error, logger, 'dns:create failed')
    }
  })

  ipcMain.handle('mmcf:dns:update', async (_event, raw: unknown) => {
    const parsed = updateDnsRecordSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await dnsWriteService.updateRecord(parsed.data))
    } catch (error) {
      return writeError(error, logger, 'dns:update failed')
    }
  })

  ipcMain.handle('mmcf:dns:delete', async (_event, raw: unknown) => {
    const parsed = deleteDnsRecordSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await dnsWriteService.deleteRecord(parsed.data))
    } catch (error) {
      return writeError(error, logger, 'dns:delete failed')
    }
  })

  ipcMain.handle('mmcf:waf:setRuleEnabled', async (_event, raw: unknown) => {
    const parsed = setWafRuleEnabledSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await wafWriteService.setRuleEnabled(parsed.data))
    } catch (error) {
      return writeError(error, logger, 'waf:setRuleEnabled failed')
    }
  })

  ipcMain.handle('mmcf:waf:deleteRule', async (_event, raw: unknown) => {
    const parsed = deleteWafRuleSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await wafWriteService.deleteRule(parsed.data))
    } catch (error) {
      return writeError(error, logger, 'waf:deleteRule failed')
    }
  })

  ipcMain.handle('mmcf:waf:createRule', async (_event, raw: unknown) => {
    const parsed = createWafRuleSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await wafWriteService.createRule(parsed.data))
    } catch (error) {
      return writeError(error, logger, 'waf:createRule failed')
    }
  })

  ipcMain.handle('mmcf:waf:updateRule', async (_event, raw: unknown) => {
    const parsed = updateWafRuleSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await wafWriteService.updateRule(parsed.data))
    } catch (error) {
      return writeError(error, logger, 'waf:updateRule failed')
    }
  })

  ipcMain.handle('mmcf:activity:list', (_event, raw: unknown) => {
    const parsed = activityListQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(activityService.listForZone(parsed.data.zoneId, parsed.data.limit))
    } catch (error) {
      logger.error('activity:list failed', { error })
      return ipcErr(APP_ERROR_CODES.UNKNOWN, 'Unable to load activity.')
    }
  })
}

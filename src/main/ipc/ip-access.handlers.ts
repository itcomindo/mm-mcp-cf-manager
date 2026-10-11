import { ipcMain } from 'electron'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'
import {
  createIpAccessRuleSchema,
  deleteIpAccessRuleSchema,
  ipAccessListQuerySchema,
} from '@shared/schemas/ip-access.schema'
import type { AccountIpAccessService } from '../cloudflare/ip-access/account-ip-access.service'
import type { Logger } from '../logging/logger'
import { ipcErr, ipcOk } from './ipc-result'

export function registerIpAccessHandlers(deps: {
  accountIpAccessService: AccountIpAccessService
  logger: Logger
}): void {
  const { accountIpAccessService, logger } = deps

  ipcMain.handle('mmcf:ipAccess:getAccounts', async () => {
    try {
      return ipcOk(await accountIpAccessService.listAccounts())
    } catch (error) {
      logger.error('ipAccess:getAccounts failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to list accounts.')
    }
  })

  ipcMain.handle('mmcf:ipAccess:list', async (_event, raw: unknown) => {
    const parsed = ipAccessListQuerySchema.safeParse(raw ?? {})
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await accountIpAccessService.listRules(parsed.data))
    } catch (error) {
      logger.error('ipAccess:list failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to list IP access rules.')
    }
  })

  ipcMain.handle('mmcf:ipAccess:create', async (_event, raw: unknown) => {
    const parsed = createIpAccessRuleSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await accountIpAccessService.createWhitelistRule(parsed.data))
    } catch (error) {
      logger.error('ipAccess:create failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to add IP access rule.')
    }
  })

  ipcMain.handle('mmcf:ipAccess:delete', async (_event, raw: unknown) => {
    const parsed = deleteIpAccessRuleSchema.safeParse(raw)
    if (!parsed.success) {
      return ipcErr(APP_ERROR_CODES.VALIDATION_FAILED, parsed.error.message)
    }
    try {
      return ipcOk(await accountIpAccessService.deleteRule(parsed.data))
    } catch (error) {
      logger.error('ipAccess:delete failed', { error })
      const code = (error as { code?: string }).code ?? APP_ERROR_CODES.MCP_TOOL_ERROR
      return ipcErr(code, error instanceof Error ? error.message : 'Unable to remove IP access rule.')
    }
  })
}

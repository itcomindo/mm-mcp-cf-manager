import { parseToolTextJson } from '@shared/mcp/parse-tool-text-json'
import {
  type CloudflareListPage,
  type CloudflareZoneRecord,
  mergeZonePages,
  normalizeCloudflareZoneRecord,
  shouldFetchAnotherZoneListPage,
  ZONES_LIST_MAX_PAGES,
  ZONES_LIST_PER_PAGE,
} from '@shared/cloudflare/zone-pagination'
import type { Logger } from '../logging/logger'
import type { McpClientService } from './mcp-client.service'
import { parseExecuteJson, type ExecuteErrorBody } from './execute-response'
import { extractZonesListExecutePayload } from './extract-zones-list-payload'
import type { IpAccessRule } from '@shared/schemas/ip-access.schema'
import { normalizeIpAccessRule } from '../cloudflare/ip-access/ip-access.mappers'
import {
  buildListAccountIpAccessRulesPageExecuteCode,
  buildListAccountsPageExecuteCode,
  buildListZonesPageExecuteCode,
} from './safe-execute'
import { mapWhoamiToConnectionPatch } from './whoami-mapper'

type ZonesPageExecuteResult = {
  result?: unknown
  result_info?: CloudflareListPage['result_info'] | null
  zones?: unknown[]
}

type AccountsPageExecuteResult = ZonesPageExecuteResult

export class CloudflareMcpAdapter {
  constructor(
    private mcpClient: McpClientService,
    private logger: Logger,
  ) {}

  async whoami(endpoint: string, token: string): Promise<ReturnType<typeof mapWhoamiToConnectionPatch>> {
    const raw = await this.mcpClient.callTool(endpoint, token, { name: 'whoami' })
    const json = parseToolTextJson(raw)
    return mapWhoamiToConnectionPatch(json)
  }

  async executeReviewed<T extends Record<string, unknown>>(
    endpoint: string,
    token: string,
    code: string,
  ): Promise<T> {
    const raw = await this.mcpClient.callTool(endpoint, token, {
      name: 'execute',
      arguments: { code },
    })
    const json = parseToolTextJson(raw) as T | ExecuteErrorBody
    return parseExecuteJson(json)
  }

  async listAccountIds(endpoint: string, token: string): Promise<string[]> {
    return this.fetchAllAccountIds(endpoint, token)
  }

  async listAccountIpAccessRules(
    endpoint: string,
    token: string,
    accountId: string,
    mode: 'whitelist' | 'all',
  ): Promise<{ rules: IpAccessRule[]; total: number }> {
    const rules: IpAccessRule[] = []
    let page = 1
    let listMeta: CloudflareListPage['result_info']
    const modeFilter = mode === 'whitelist' ? 'whitelist' : undefined

    while (page <= ZONES_LIST_MAX_PAGES) {
      const json = await this.executeReviewed<{
        result?: unknown[]
        result_info?: CloudflareListPage['result_info'] | null
      }>(
        endpoint,
        token,
        buildListAccountIpAccessRulesPageExecuteCode(
          accountId,
          page,
          ZONES_LIST_PER_PAGE,
          modeFilter,
        ),
      )

      const batch = Array.isArray(json.result) ? json.result : []
      if (json.result_info) {
        listMeta = {
          total_count: json.result_info.total_count ?? listMeta?.total_count,
          total_pages: json.result_info.total_pages ?? listMeta?.total_pages,
          per_page: json.result_info.per_page ?? listMeta?.per_page,
          page: json.result_info.page ?? listMeta?.page,
          count: json.result_info.count ?? listMeta?.count,
        }
      }

      for (const row of batch) {
        const normalized = normalizeIpAccessRule(row)
        if (normalized) rules.push(normalized)
      }

      const collected = rules.length
      if (!shouldFetchAnotherZoneListPage(page, batch.length, collected, listMeta)) {
        break
      }
      page += 1
    }

    return {
      rules,
      total: listMeta?.total_count ?? rules.length,
    }
  }

  private async fetchAllAccountIds(endpoint: string, token: string): Promise<string[]> {
    const ids: string[] = []
    let page = 1
    let listMeta: CloudflareListPage['result_info']

    try {
      while (page <= ZONES_LIST_MAX_PAGES) {
        const json = await this.executeReviewed<AccountsPageExecuteResult>(
          endpoint,
          token,
          buildListAccountsPageExecuteCode(page, ZONES_LIST_PER_PAGE),
        )
        const { batch, result_info } = extractZonesListExecutePayload(json)
        if (result_info) {
          listMeta = {
            total_count: result_info.total_count ?? listMeta?.total_count,
            total_pages: result_info.total_pages ?? listMeta?.total_pages,
          }
        }
        for (const row of batch) {
          if (row && typeof row === 'object' && typeof (row as { id?: string }).id === 'string') {
            ids.push((row as { id: string }).id)
          }
        }
        const collected = ids.length
        if (!shouldFetchAnotherZoneListPage(page, batch.length, collected, listMeta)) {
          break
        }
        page += 1
      }
    } catch (error) {
      this.logger.warn('Account list unavailable during zone sync; using unscoped zone list', {
        message: error instanceof Error ? error.message : String(error),
      })
      return []
    }

    return [...new Set(ids)]
  }

  private async fetchZonePagesForScope(
    endpoint: string,
    token: string,
    accountId?: string,
  ): Promise<CloudflareListPage[]> {
    const pages: CloudflareListPage[] = []
    let page = 1
    let listMeta: CloudflareListPage['result_info']
    let previousCollected = 0

    while (page <= ZONES_LIST_MAX_PAGES) {
      const json = await this.executeReviewed<ZonesPageExecuteResult>(
        endpoint,
        token,
        buildListZonesPageExecuteCode(page, ZONES_LIST_PER_PAGE, accountId),
      )

      const { batch: rawBatch, result_info } = extractZonesListExecutePayload(json)
      if (result_info) {
        listMeta = {
          total_count: result_info.total_count ?? listMeta?.total_count,
          total_pages: result_info.total_pages ?? listMeta?.total_pages,
          per_page: result_info.per_page ?? listMeta?.per_page,
          page: result_info.page ?? listMeta?.page,
          count: result_info.count ?? listMeta?.count,
        }
      }

      const batch = rawBatch
        .map((row) => normalizeCloudflareZoneRecord(row))
        .filter((zone): zone is CloudflareZoneRecord => zone !== null)

      pages.push({ result: batch, result_info: result_info ?? undefined })

      const collectedCount = mergeZonePages(pages).length
      const added = collectedCount - previousCollected
      previousCollected = collectedCount

      this.logger.info('Zone list page fetched', {
        accountId: accountId ?? 'all',
        page,
        batch: batch.length,
        collected: collectedCount,
        totalCount: listMeta?.total_count,
        totalPages: listMeta?.total_pages,
      })

      if (batch.length > 0 && added === 0) {
        break
      }

      if (!shouldFetchAnotherZoneListPage(page, batch.length, collectedCount, listMeta)) {
        break
      }
      page += 1
    }

    return pages
  }

  async listAllZones(endpoint: string, token: string): Promise<CloudflareZoneRecord[]> {
    const accountIds = await this.fetchAllAccountIds(endpoint, token)
    const pageGroups: CloudflareListPage[] = []

    if (accountIds.length > 0) {
      this.logger.info('Syncing zones per Cloudflare account', { accounts: accountIds.length })
      for (const accountId of accountIds) {
        pageGroups.push(...(await this.fetchZonePagesForScope(endpoint, token, accountId)))
      }
    }

    pageGroups.push(...(await this.fetchZonePagesForScope(endpoint, token)))

    const merged = mergeZonePages(pageGroups)
    this.logger.info('Zone list sync merged', {
      accounts: accountIds.length,
      zones: merged.length,
    })
    return merged
  }
}

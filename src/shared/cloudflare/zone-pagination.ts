export type CloudflareZoneRecord = {
  id?: string
  name?: string
  status?: string
  account?: { id?: string }
  plan?: { name?: string }
}

export type CloudflareListPage = {
  result: CloudflareZoneRecord[]
  result_info?: {
    page?: number
    per_page?: number
    total_pages?: number
    count?: number
    total_count?: number
  }
}

export const ZONES_LIST_PER_PAGE = 50

/** Max pages when syncing zones (50 × 200 = 10_000 zones). */
export const ZONES_LIST_MAX_PAGES = 200

export function normalizeCloudflareZoneRecord(raw: unknown): CloudflareZoneRecord | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const row = raw as Record<string, unknown>
  const id =
    typeof row.id === 'string'
      ? row.id
      : typeof row.zone_id === 'string'
        ? row.zone_id
        : undefined
  const name =
    typeof row.name === 'string'
      ? row.name
      : typeof row.domain === 'string'
        ? row.domain
        : undefined
  if (!id || !name) {
    return null
  }

  const accountRaw = row.account
  const account =
    accountRaw && typeof accountRaw === 'object'
      ? {
          id:
            typeof (accountRaw as Record<string, unknown>).id === 'string'
              ? ((accountRaw as Record<string, unknown>).id as string)
              : undefined,
        }
      : undefined

  const planRaw = row.plan
  const plan =
    planRaw && typeof planRaw === 'object'
      ? {
          name:
            typeof (planRaw as Record<string, unknown>).name === 'string'
              ? ((planRaw as Record<string, unknown>).name as string)
              : undefined,
        }
      : undefined

  return {
    id,
    name,
    status: typeof row.status === 'string' ? row.status : undefined,
    account,
    plan,
  }
}

/** Whether to request another zones list page after `page` completes. */
export function shouldFetchAnotherZoneListPage(
  page: number,
  batchLength: number,
  collectedCount: number,
  resultInfo?: CloudflareListPage['result_info'],
): boolean {
  if (batchLength === 0) {
    return false
  }
  const totalCount = resultInfo?.total_count
  if (totalCount != null && totalCount > 0 && collectedCount >= totalCount) {
    return false
  }
  const totalPages = resultInfo?.total_pages
  if (
    totalCount == null &&
    totalPages != null &&
    totalPages > 0 &&
    page >= totalPages
  ) {
    return false
  }
  // MCP may return fewer than per_page rows per call; keep paging until totals or an empty batch.
  return true
}

export function mergeZonePages(pages: CloudflareListPage[]): CloudflareZoneRecord[] {
  const byId = new Map<string, CloudflareZoneRecord>()
  for (const page of pages) {
    for (const zone of page.result ?? []) {
      if (zone.id) {
        byId.set(zone.id, zone)
      }
    }
  }
  return [...byId.values()]
}

export function countFreePlanZones(zones: CloudflareZoneRecord[]): number {
  return zones.filter((zone) => {
    const plan = zone.plan?.name?.toLowerCase() ?? ''
    return plan.includes('free')
  }).length
}

import type { ZoneCapabilities } from '@shared/schemas/capabilities.schema'
import type { ZoneOverview } from '@shared/schemas/zone-read.schema'

export type StoredZoneReadCache = {
  capabilities?: ZoneCapabilities
  detailRefreshedAt?: string
  snapshot?: Partial<ZoneOverview>
}

export type ZoneReadCacheUpdate = {
  capabilities?: ZoneCapabilities
  detailRefreshedAt: string
  snapshot?: Partial<ZoneOverview>
}

export function parseZoneReadCacheJson(json: string | null): StoredZoneReadCache {
  if (!json) {
    return {}
  }
  try {
    return JSON.parse(json) as StoredZoneReadCache
  } catch {
    return {}
  }
}

export function parseZoneDetailRefreshedAt(json: string | null): string | null {
  const refreshed = parseZoneReadCacheJson(json).detailRefreshedAt
  return refreshed ?? null
}

export function mergeZoneReadCachePayload(
  existing: StoredZoneReadCache,
  input: ZoneReadCacheUpdate,
): Required<Pick<StoredZoneReadCache, 'capabilities' | 'detailRefreshedAt' | 'snapshot'>> {
  const capabilities = {
    ...(existing.capabilities ?? {}),
    ...(input.capabilities ?? {}),
  }
  const snapshot =
    input.snapshot === undefined
      ? { ...(existing.snapshot ?? {}) }
      : { ...(existing.snapshot ?? {}), ...input.snapshot }

  return {
    capabilities,
    detailRefreshedAt: input.detailRefreshedAt,
    snapshot,
  }
}

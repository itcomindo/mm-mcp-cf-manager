import type { DnsRecord, WafRule, ZoneOverview } from '@shared/schemas/zone-read.schema'
import type { ZoneCapabilities } from '@shared/schemas/capabilities.schema'

type RawZone = {
  id?: string
  name?: string
  status?: string
  account?: { id?: string }
  plan?: { name?: string }
}

export function mapOverviewPayload(input: {
  zone: RawZone
  developmentMode: boolean | null
  securityLevel: string | null
  underAttackMode: boolean | null
  sslMode: string | null
  cached: {
    lastSyncedAt: string | null
    detailRefreshedAt: string | null
    capabilities?: ZoneCapabilities
  }
}): ZoneOverview {
  return {
    zoneId: input.zone.id ?? '',
    domain: input.zone.name ?? '',
    accountId: input.zone.account?.id ?? null,
    status: input.zone.status ?? null,
    planName: input.zone.plan?.name ?? null,
    developmentMode: input.developmentMode,
    securityLevel: input.securityLevel,
    underAttackMode: input.underAttackMode,
    sslMode: input.sslMode,
    lastSyncedAt: input.cached.lastSyncedAt,
    detailRefreshedAt: input.cached.detailRefreshedAt,
    capabilities: input.cached.capabilities,
  }
}

export function mapDnsRecord(raw: Record<string, unknown>): DnsRecord | null {
  const id = typeof raw.id === 'string' ? raw.id : null
  const type = typeof raw.type === 'string' ? raw.type : null
  const name = typeof raw.name === 'string' ? raw.name : null
  const content = typeof raw.content === 'string' ? raw.content : ''
  if (!id || !type || !name) return null
  return {
    id,
    type,
    name,
    content,
    proxied: typeof raw.proxied === 'boolean' ? raw.proxied : null,
    ttl: typeof raw.ttl === 'number' ? raw.ttl : null,
    modifiedOn: typeof raw.modified_on === 'string' ? raw.modified_on : null,
  }
}

export function mapWafRule(raw: Record<string, unknown>): WafRule | null {
  const id = typeof raw.id === 'string' ? raw.id : null
  if (!id) return null
  return {
    id,
    description: typeof raw.description === 'string' ? raw.description : null,
    expression: typeof raw.expression === 'string' ? raw.expression : null,
    action: typeof raw.action === 'string' ? raw.action : null,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : null,
  }
}

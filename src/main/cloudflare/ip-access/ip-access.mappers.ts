import type { IpAccessRule } from '@shared/schemas/ip-access.schema'

export function normalizeIpAccessRule(raw: unknown): IpAccessRule | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : null
  if (!id) return null

  const configuration =
    row.configuration && typeof row.configuration === 'object'
      ? (row.configuration as Record<string, unknown>)
      : null
  const target =
    configuration && typeof configuration.target === 'string' ? configuration.target : ''
  const value =
    configuration && typeof configuration.value === 'string' ? configuration.value : ''

  const scope =
    row.scope && typeof row.scope === 'object' ? (row.scope as Record<string, unknown>) : null
  const scopeType = scope && typeof scope.type === 'string' ? scope.type : null

  return {
    id,
    mode: typeof row.mode === 'string' ? row.mode : '',
    configurationTarget: target,
    configurationValue: value,
    notes: typeof row.notes === 'string' ? row.notes : null,
    createdOn: typeof row.created_on === 'string' ? row.created_on : null,
    modifiedOn: typeof row.modified_on === 'string' ? row.modified_on : null,
    scopeType,
  }
}

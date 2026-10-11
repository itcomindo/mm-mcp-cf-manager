import type { CapabilityKey } from '@shared/schemas/capabilities.schema'
import type { BulkActionKind } from '@shared/schemas/tasks.schema'
import type { ResourceScope } from '../cloudflare/resource-lock.service'

export type BulkActionDefinition = {
  kind: BulkActionKind
  label: string
  resource: ResourceScope
  capabilityKey: CapabilityKey
  destructive?: boolean
  /** Read-only bulk actions: eligible when the zone row exists locally (no capability gate). */
  readOnlyRefresh?: boolean
}

export const BULK_ACTION_DEFINITIONS: Record<BulkActionKind, BulkActionDefinition> = {
  'cache.purge_everything': {
    kind: 'cache.purge_everything',
    label: 'Purge Everything',
    resource: 'cache',
    capabilityKey: 'cachePurge',
    destructive: true,
  },
  'cache.development_mode_on': {
    kind: 'cache.development_mode_on',
    label: 'Development Mode ON',
    resource: 'cache',
    capabilityKey: 'devModeWrite',
  },
  'cache.development_mode_off': {
    kind: 'cache.development_mode_off',
    label: 'Development Mode OFF',
    resource: 'cache',
    capabilityKey: 'devModeWrite',
  },
  'security.under_attack_on': {
    kind: 'security.under_attack_on',
    label: 'Under Attack Mode ON',
    resource: 'security',
    capabilityKey: 'securityWrite',
  },
  'security.under_attack_off': {
    kind: 'security.under_attack_off',
    label: 'Under Attack Mode OFF',
    resource: 'security',
    capabilityKey: 'securityWrite',
  },
  'zones.refresh_detail': {
    kind: 'zones.refresh_detail',
    label: 'Refresh zone detail',
    resource: 'cache',
    capabilityKey: 'devModeRead',
    readOnlyRefresh: true,
  },
}

export function bulkActionLabel(kind: BulkActionKind): string {
  return BULK_ACTION_DEFINITIONS[kind].label
}

import type {
  CopyTokenResult,
  IpcResult,
  RevealTokenResult,
  SaveConnectionPayload,
  SettingsGetAllResult,
  SettingsPathsResult,
  SettingsUpdateAppearancePayload,
  SettingsUpdateBehaviorPayload,
} from '@shared/types/ipc'
import type { ActivityListResult } from '@shared/schemas/activity.schema'
import type {
  ActiveTasksResult,
  BulkActionKind,
  BulkPreviewResult,
  TaskDetail,
} from '@shared/schemas/tasks.schema'
import type { ConnectionStatus } from '@shared/schemas/connection.schema'
import type { SyncZonesResult, ZoneListResult } from '@shared/schemas/zones.schema'
import type {
  CreateDnsRecordInput,
  CreateWafRuleInput,
  DeleteDnsRecordInput,
  DeleteWafRuleInput,
  SetWafRuleEnabledInput,
  UpdateDnsRecordInput,
  UpdateWafRuleInput,
  WriteActionResult,
} from '@shared/schemas/write-actions.schema'
import type {
  CacheStatus,
  DnsListResult,
  SecurityStatus,
  WafListResult,
  ZoneOverview,
} from '@shared/schemas/zone-read.schema'
import type {
  CreateIpAccessRuleInput,
  DeleteIpAccessRuleInput,
  IpAccessAccountsResult,
  IpAccessListResult,
} from '@shared/schemas/ip-access.schema'
import type { AppSettings } from '@shared/schemas/settings.schema'
import type {
  AdminDataField,
  AdminDataFieldType,
  AdminDataPopoverResult,
} from '@shared/schemas/admin-data.schema'

export interface MmcfApi {
  settings: {
    getAll: () => Promise<IpcResult<SettingsGetAllResult>>
    updateAppearance: (
      payload: SettingsUpdateAppearancePayload,
    ) => Promise<IpcResult<AppSettings>>
    updateBehavior: (
      payload: SettingsUpdateBehaviorPayload,
    ) => Promise<IpcResult<AppSettings>>
    getPaths: () => Promise<IpcResult<SettingsPathsResult>>
    openUserDataFolder: () => Promise<IpcResult<{ opened: boolean }>>
    resetUiPreferences: () => Promise<IpcResult<AppSettings>>
  }
  connection: {
    getStatus: () => Promise<IpcResult<ConnectionStatus>>
    save: (payload: SaveConnectionPayload) => Promise<IpcResult<ConnectionStatus>>
    test: () => Promise<IpcResult<ConnectionStatus>>
    disconnect: () => Promise<IpcResult<ConnectionStatus>>
    revealToken: () => Promise<IpcResult<RevealTokenResult>>
    copyTokenToClipboard: () => Promise<IpcResult<CopyTokenResult>>
    syncZones: () => Promise<
      IpcResult<SyncZonesResult & { status: ConnectionStatus }>
    >
  }
  zones: {
    list: () => Promise<IpcResult<ZoneListResult>>
    getOverview: (zoneId: string) => Promise<IpcResult<ZoneOverview>>
    refresh: (zoneId: string) => Promise<IpcResult<ZoneOverview>>
  }
  dns: {
    list: (payload: { zoneId: string; search?: string }) => Promise<IpcResult<DnsListResult>>
    create: (payload: CreateDnsRecordInput) => Promise<IpcResult<WriteActionResult>>
    update: (payload: UpdateDnsRecordInput) => Promise<IpcResult<WriteActionResult>>
    delete: (payload: DeleteDnsRecordInput) => Promise<IpcResult<WriteActionResult>>
  }
  cache: {
    getStatus: (zoneId: string) => Promise<IpcResult<CacheStatus>>
    purgeEverything: (zoneId: string) => Promise<IpcResult<WriteActionResult>>
    setDevelopmentMode: (payload: {
      zoneId: string
      enabled: boolean
    }) => Promise<IpcResult<WriteActionResult>>
  }
  security: {
    getStatus: (zoneId: string) => Promise<IpcResult<SecurityStatus>>
    setUnderAttackMode: (payload: {
      zoneId: string
      enabled: boolean
      restoreLevel?: string
    }) => Promise<IpcResult<WriteActionResult>>
  }
  waf: {
    listRules: (zoneId: string) => Promise<IpcResult<WafListResult>>
    setRuleEnabled: (payload: SetWafRuleEnabledInput) => Promise<IpcResult<WriteActionResult>>
    deleteRule: (payload: DeleteWafRuleInput) => Promise<IpcResult<WriteActionResult>>
    createRule: (payload: CreateWafRuleInput) => Promise<IpcResult<WriteActionResult>>
    updateRule: (payload: UpdateWafRuleInput) => Promise<IpcResult<WriteActionResult>>
  }
  activity: {
    list: (payload: { zoneId: string; limit?: number }) => Promise<IpcResult<ActivityListResult>>
  }
  bulk: {
    preview: (payload: {
      action: BulkActionKind
      zoneIds: string[]
    }) => Promise<IpcResult<BulkPreviewResult>>
    createTask: (payload: {
      action: BulkActionKind
      zoneIds: string[]
    }) => Promise<IpcResult<{ taskId: string }>>
  }
  tasks: {
    get: (taskId: string) => Promise<IpcResult<TaskDetail>>
    listActive: () => Promise<IpcResult<ActiveTasksResult>>
    cancel: (taskId: string) => Promise<IpcResult<{ cancelled: boolean }>>
  }
  app: {
    getVersion: () => Promise<IpcResult<{ version: string }>>
  }
  ipAccess: {
    getAccounts: () => Promise<IpcResult<IpAccessAccountsResult>>
    list: (payload?: {
      accountId?: string
      mode?: 'whitelist' | 'all'
    }) => Promise<IpcResult<IpAccessListResult>>
    create: (payload: CreateIpAccessRuleInput) => Promise<IpcResult<WriteActionResult>>
    delete: (payload: DeleteIpAccessRuleInput) => Promise<IpcResult<WriteActionResult>>
  }
  adminData: {
    listFields: () => Promise<IpcResult<{ fields: AdminDataField[] }>>
    createField: (payload: {
      label: string
      fieldType: AdminDataFieldType
    }) => Promise<IpcResult<AdminDataField>>
    updateField: (payload: {
      fieldId: string
      label?: string
    }) => Promise<IpcResult<AdminDataField>>
    deleteField: (payload: { fieldId: string }) => Promise<IpcResult<{ deleted: boolean }>>
    getZoneValues: (payload: {
      zoneId: string
    }) => Promise<IpcResult<{ zoneId: string; values: Record<string, string> }>>
    saveZoneValues: (payload: {
      zoneId: string
      values: Record<string, string>
    }) => Promise<IpcResult<{ zoneId: string; saved: true }>>
    getPopover: (payload: { zoneId: string }) => Promise<IpcResult<AdminDataPopoverResult>>
  }
}

declare global {
  interface Window {
    mmcf: MmcfApi
  }
}

export {}

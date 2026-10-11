import { contextBridge, ipcRenderer } from 'electron'
import type { MmcfApi } from './api-types'

const allowedChannels = new Set([
  'mmcf:settings:getAll',
  'mmcf:settings:updateAppearance',
  'mmcf:settings:updateBehavior',
  'mmcf:settings:getPaths',
  'mmcf:settings:openUserDataFolder',
  'mmcf:settings:resetUiPreferences',
  'mmcf:connection:getStatus',
  'mmcf:connection:save',
  'mmcf:connection:test',
  'mmcf:connection:disconnect',
  'mmcf:connection:revealToken',
  'mmcf:connection:copyTokenToClipboard',
  'mmcf:connection:syncZones',
  'mmcf:zones:list',
  'mmcf:zones:getOverview',
  'mmcf:zones:refresh',
  'mmcf:dns:list',
  'mmcf:cache:getStatus',
  'mmcf:security:getStatus',
  'mmcf:waf:listRules',
  'mmcf:cache:purgeEverything',
  'mmcf:cache:setDevelopmentMode',
  'mmcf:security:setUnderAttackMode',
  'mmcf:dns:create',
  'mmcf:dns:update',
  'mmcf:dns:delete',
  'mmcf:waf:setRuleEnabled',
  'mmcf:waf:deleteRule',
  'mmcf:waf:createRule',
  'mmcf:waf:updateRule',
  'mmcf:activity:list',
  'mmcf:bulk:preview',
  'mmcf:bulk:createTask',
  'mmcf:tasks:get',
  'mmcf:tasks:listActive',
  'mmcf:tasks:cancel',
  'mmcf:app:getVersion',
  'mmcf:ipAccess:getAccounts',
  'mmcf:ipAccess:list',
  'mmcf:ipAccess:create',
  'mmcf:ipAccess:delete',
])

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  if (!allowedChannels.has(channel)) {
    return Promise.reject(new Error(`Blocked IPC channel: ${channel}`))
  }
  return ipcRenderer.invoke(channel, payload) as Promise<T>
}

const api: MmcfApi = {
  settings: {
    getAll: () => invoke('mmcf:settings:getAll'),
    updateAppearance: (payload) => invoke('mmcf:settings:updateAppearance', payload),
    updateBehavior: (payload) => invoke('mmcf:settings:updateBehavior', payload),
    getPaths: () => invoke('mmcf:settings:getPaths'),
    openUserDataFolder: () => invoke('mmcf:settings:openUserDataFolder'),
    resetUiPreferences: () => invoke('mmcf:settings:resetUiPreferences'),
  },
  connection: {
    getStatus: () => invoke('mmcf:connection:getStatus'),
    save: (payload) => invoke('mmcf:connection:save', payload),
    test: () => invoke('mmcf:connection:test'),
    disconnect: () => invoke('mmcf:connection:disconnect'),
    revealToken: () => invoke('mmcf:connection:revealToken'),
    copyTokenToClipboard: () => invoke('mmcf:connection:copyTokenToClipboard'),
    syncZones: () => invoke('mmcf:connection:syncZones'),
  },
  zones: {
    list: () => invoke('mmcf:zones:list'),
    getOverview: (zoneId) => invoke('mmcf:zones:getOverview', { zoneId }),
    refresh: (zoneId) => invoke('mmcf:zones:refresh', { zoneId }),
  },
  cache: {
    getStatus: (zoneId) => invoke('mmcf:cache:getStatus', { zoneId }),
    purgeEverything: (zoneId) => invoke('mmcf:cache:purgeEverything', { zoneId }),
    setDevelopmentMode: (payload) => invoke('mmcf:cache:setDevelopmentMode', payload),
  },
  security: {
    getStatus: (zoneId) => invoke('mmcf:security:getStatus', { zoneId }),
    setUnderAttackMode: (payload) => invoke('mmcf:security:setUnderAttackMode', payload),
  },
  dns: {
    list: (payload) => invoke('mmcf:dns:list', payload),
    create: (payload) => invoke('mmcf:dns:create', payload),
    update: (payload) => invoke('mmcf:dns:update', payload),
    delete: (payload) => invoke('mmcf:dns:delete', payload),
  },
  waf: {
    listRules: (zoneId) => invoke('mmcf:waf:listRules', { zoneId }),
    setRuleEnabled: (payload) => invoke('mmcf:waf:setRuleEnabled', payload),
    deleteRule: (payload) => invoke('mmcf:waf:deleteRule', payload),
    createRule: (payload) => invoke('mmcf:waf:createRule', payload),
    updateRule: (payload) => invoke('mmcf:waf:updateRule', payload),
  },
  activity: {
    list: (payload) => invoke('mmcf:activity:list', payload),
  },
  bulk: {
    preview: (payload) => invoke('mmcf:bulk:preview', payload),
    createTask: (payload) => invoke('mmcf:bulk:createTask', payload),
  },
  tasks: {
    get: (taskId) => invoke('mmcf:tasks:get', { taskId }),
    listActive: () => invoke('mmcf:tasks:listActive'),
    cancel: (taskId) => invoke('mmcf:tasks:cancel', { taskId }),
  },
  app: {
    getVersion: () => invoke('mmcf:app:getVersion'),
  },
  ipAccess: {
    getAccounts: () => invoke('mmcf:ipAccess:getAccounts'),
    list: (payload) => invoke('mmcf:ipAccess:list', payload),
    create: (payload) => invoke('mmcf:ipAccess:create', payload),
    delete: (payload) => invoke('mmcf:ipAccess:delete', payload),
  },
}

contextBridge.exposeInMainWorld('mmcf', api)

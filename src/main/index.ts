import { app, BrowserWindow, Menu, session } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { APP_ID } from '@shared/constants/app'
import { createMainWindow } from './app/create-window'
import { appendLauncherBootLine } from './app/launcher-log'
import { resolvePreloadPath } from './app/resolve-preload-path'
import { registerIpcHandlers } from './ipc/register-handlers'
import { Logger } from './logging/logger'
import { CloudflareMcpAdapter } from './mcp/cloudflare-mcp.adapter'
import { McpClientService } from './mcp/mcp-client.service'
import { DatabaseService } from './persistence/database.service'
import { CredentialService } from './security/credential.service'
import { ZoneService } from './cloudflare/zones/zone.service'
import { ActivityService } from './cloudflare/activity.service'
import { CacheService } from './cloudflare/cache/cache.service'
import { DnsWriteService } from './cloudflare/dns/dns-write.service'
import { ResourceLockService } from './cloudflare/resource-lock.service'
import { SecurityService } from './cloudflare/security/security.service'
import { AccountIpAccessService } from './cloudflare/ip-access/account-ip-access.service'
import { WafWriteService } from './cloudflare/waf/waf-write.service'
import { WriteActionRunner } from './cloudflare/write-action.runner'
import { TaskQueueService } from './tasks/task-queue.service'
import { ZoneReadService } from './cloudflare/zones/zone-read.service'
import { ConnectionService } from './services/connection.service'
import { SettingsService } from './services/settings.service'

const isDev = !app.isPackaged

let logger: Logger
let settingsService: SettingsService
let preloadPath = ''

function ensureUserDataLayout(userDataPath: string): { logsPath: string; databasePath: string } {
  const logsPath = join(userDataPath, 'logs')
  if (!existsSync(logsPath)) {
    mkdirSync(logsPath, { recursive: true })
  }
  const databasePath = DatabaseService.resolveDatabasePath(userDataPath)
  return { logsPath, databasePath }
}

function configureCsp(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        ],
      },
    })
  })
}

function openMainWindow(): void {
  createMainWindow({
    settingsService,
    preloadPath,
    isDev,
    logger,
  })
}

async function bootstrap(): Promise<void> {
  Menu.setApplicationMenu(null)

  app.setName('MM MCP CF Manager')
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_ID)
  }

  preloadPath = resolvePreloadPath(__dirname)
  const rendererIndex = join(__dirname, '../renderer/index.html')
  if (!existsSync(preloadPath)) {
    console.error('[main] Preload script missing:', preloadPath)
  }

  const userDataPath = app.getPath('userData')
  const { logsPath, databasePath } = ensureUserDataLayout(userDataPath)
  logger = new Logger(logsPath, isDev ? 'debug' : 'info')
  logger.info('Application starting', {
    isDev,
    userDataPath,
    preloadPath,
    rendererIndex,
    nodeEnvElectronVite: process.env.NODE_ENV_ELECTRON_VITE,
    electronRendererUrl: process.env.ELECTRON_RENDERER_URL,
    mmcfLauncher: process.env.MMCF_LAUNCHER,
  })
  appendLauncherBootLine(
    `[main boot] preload=${preloadPath} renderer=${rendererIndex} NODE_ENV_ELECTRON_VITE=${process.env.NODE_ENV_ELECTRON_VITE ?? ''} ELECTRON_RENDERER_URL=${process.env.ELECTRON_RENDERER_URL ?? ''}`,
  )

  const database = new DatabaseService(databasePath, logger)
  settingsService = new SettingsService(database)
  const credentialService = new CredentialService(userDataPath)
  const mcpClientService = new McpClientService(logger)
  const cloudflareAdapter = new CloudflareMcpAdapter(mcpClientService, logger)
  const connectionService = new ConnectionService(database, credentialService, cloudflareAdapter)
  const zoneService = new ZoneService(database, connectionService, cloudflareAdapter)
  const zoneReadService = new ZoneReadService(database, connectionService, cloudflareAdapter)
  const activityService = new ActivityService(database)
  const resourceLockService = new ResourceLockService()
  const writeActionRunner = new WriteActionRunner(
    database,
    settingsService,
    connectionService,
    resourceLockService,
    activityService,
  )
  const cacheService = new CacheService(
    database,
    connectionService,
    cloudflareAdapter,
    writeActionRunner,
    zoneReadService,
  )
  const securityService = new SecurityService(
    database,
    connectionService,
    cloudflareAdapter,
    writeActionRunner,
    zoneReadService,
  )
  const dnsWriteService = new DnsWriteService(
    database,
    connectionService,
    cloudflareAdapter,
    writeActionRunner,
  )
  const wafWriteService = new WafWriteService(
    database,
    connectionService,
    cloudflareAdapter,
    writeActionRunner,
  )
  const accountIpAccessService = new AccountIpAccessService(
    connectionService,
    cloudflareAdapter,
    writeActionRunner,
  )
  const taskQueueService = new TaskQueueService(
    database,
    settingsService,
    cacheService,
    securityService,
    zoneReadService,
    logger,
  )

  registerIpcHandlers({
    settingsService,
    connectionService,
    zoneService,
    zoneReadService,
    cacheService,
    securityService,
    dnsWriteService,
    wafWriteService,
    activityService,
    taskQueueService,
    accountIpAccessService,
    credentialService,
    userDataPath,
    databasePath,
    logsPath,
    logger,
    getAppVersion: () => app.getVersion(),
  })

  configureCsp()
  openMainWindow()
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [first] = BrowserWindow.getAllWindows()
    if (first) {
      if (first.isMinimized()) first.restore()
      first.focus()
    }
  })

  app.whenReady().then(bootstrap)

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && settingsService) {
      openMainWindow()
    }
  })
}

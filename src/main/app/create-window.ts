import { app, BrowserWindow, dialog, screen } from 'electron'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH } from '@shared/constants/app'
import type { Logger } from '../logging/logger'
import type { SettingsService } from '../services/settings.service'

function clampBounds(bounds: {
  x?: number
  y?: number
  width: number
  height: number
}): Electron.Rectangle {
  const display = screen.getDisplayMatching({
    x: bounds.x ?? 0,
    y: bounds.y ?? 0,
    width: bounds.width,
    height: bounds.height,
  })
  const area = display.workArea
  const width = Math.max(MIN_WINDOW_WIDTH, Math.min(bounds.width, area.width))
  const height = Math.max(MIN_WINDOW_HEIGHT, Math.min(bounds.height, area.height))
  let x = bounds.x ?? area.x + Math.floor((area.width - width) / 2)
  let y = bounds.y ?? area.y + Math.floor((area.height - height) / 2)
  x = Math.max(area.x, Math.min(x, area.x + area.width - width))
  y = Math.max(area.y, Math.min(y, area.y + area.height - height))
  return { x, y, width, height }
}

export function createMainWindow(deps: {
  settingsService: SettingsService
  preloadPath: string
  isDev: boolean
  logger: Logger
}): BrowserWindow {
  const settings = deps.settingsService.getAll()
  const initial = clampBounds(
    settings.windowBounds ?? {
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT,
    },
  )

  const preload = resolve(deps.preloadPath)
  const rendererIndex = resolve(__dirname, '../renderer/index.html')

  const window = new BrowserWindow({
    ...initial,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    title: 'MM MCP CF Manager',
    autoHideMenuBar: true,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  const saveBounds = (): void => {
    if (window.isDestroyed()) return
    const bounds = window.getBounds()
    deps.settingsService.saveWindowBounds(bounds)
  }

  window.on('resize', saveBounds)
  window.on('move', saveBounds)

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  window.webContents.on('preload-error', (_event, path, error) => {
    deps.logger.error('Preload script failed', { path, message: error.message })
    if (process.env.MMCF_LAUNCHER === '1') {
      dialog.showErrorBox(
        'MM MCP CF Manager — Preload failed',
        `${error.message}\n\nCheck %LOCALAPPDATA%\\MM-MCP-CF-Manager\\launcher.log and app logs in userData/logs.`,
      )
    }
  })

  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    deps.logger.error('Renderer failed to load', { code, description, url })
  })

  window.webContents.on('did-finish-load', () => {
    void window.webContents
      .executeJavaScript('Boolean(window.mmcf && window.mmcf.settings)')
      .then((bridgeOk) => {
        if (!bridgeOk) {
          deps.logger.error('Preload bridge missing after page load', {
            rendererIndex,
            preload,
            electronViteDev: process.env.NODE_ENV_ELECTRON_VITE,
            rendererUrl: process.env.ELECTRON_RENDERER_URL,
          })
        }
      })
      .catch(() => undefined)
  })

  const useViteDevServer =
    process.env.NODE_ENV_ELECTRON_VITE === 'development' &&
    Boolean(process.env.ELECTRON_RENDERER_URL)

  if (useViteDevServer) {
    deps.logger.info('Loading renderer from Vite dev server')
    void window.loadURL(process.env.ELECTRON_RENDERER_URL!)
  } else if (existsSync(rendererIndex)) {
    deps.logger.info('Loading built renderer', { rendererIndex, preload })
    void window.loadFile(rendererIndex)
  } else {
    deps.logger.error('Built renderer index.html not found', { rendererIndex })
    dialog.showErrorBox(
      'MM MCP CF Manager',
      `Built UI not found:\n${rendererIndex}\n\nRun run-app.bat or "npm run build" from the project folder.`,
    )
    app.quit()
  }

  return window
}

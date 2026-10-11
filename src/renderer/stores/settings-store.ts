import { create } from 'zustand'
import type { AppSettings } from '@shared/schemas/settings.schema'
import { unwrapIpc } from '../lib/mmcf-client'

type SettingsState = {
  settings: AppSettings | null
  loading: boolean
  error: string | null
  hydrate: () => Promise<void>
  patchAppearance: (partial: Partial<AppSettings['appearance']>) => Promise<void>
  patchBehavior: (partial: Partial<AppSettings['behavior']>) => Promise<void>
  resetUiPreferences: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: true,
  error: null,
  hydrate: async () => {
    set({ loading: true, error: null })
    try {
      if (typeof window.mmcf?.settings?.getAll !== 'function') {
        throw new Error(
          'Preload bridge not available (window.mmcf is missing). Close the app, run run-app.bat from the project folder or use the Desktop shortcut (not a browser tab). After an update, run create-desktop-shortcut.bat again. Check %LOCALAPPDATA%\\MM-MCP-CF-Manager\\launcher.log and userData/logs for preload errors.',
        )
      }
      const settings = unwrapIpc(await window.mmcf.settings.getAll())
      set({ settings, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load settings',
      })
    }
  },
  patchAppearance: async (partial) => {
    const result = unwrapIpc(await window.mmcf.settings.updateAppearance(partial))
    set({ settings: result })
  },
  patchBehavior: async (partial) => {
    const result = unwrapIpc(await window.mmcf.settings.updateBehavior(partial))
    set({ settings: result })
  },
  resetUiPreferences: async () => {
    const result = unwrapIpc(await window.mmcf.settings.resetUiPreferences())
    set({ settings: result })
  },
}))

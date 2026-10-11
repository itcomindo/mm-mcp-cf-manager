import { useEffect } from 'react'
import { applyAppearanceToDocument, watchSystemTheme } from '@renderer/lib/theme-dom'
import { useSettingsStore } from '@renderer/stores/settings-store'

export function ThemeSync(): null {
  const settings = useSettingsStore((s) => s.settings)

  useEffect(() => {
    if (!settings) return
    const apply = (): void => {
      applyAppearanceToDocument(settings.appearance.theme, settings.appearance.fontSize)
    }
    apply()
    if (settings.appearance.theme !== 'system') {
      return
    }
    return watchSystemTheme(apply)
  }, [settings?.appearance.theme, settings?.appearance.fontSize, settings])

  return null
}

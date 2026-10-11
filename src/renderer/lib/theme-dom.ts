import { resolveFontRootPx, type FontSizePreference } from '@shared/theme/resolve-font-size'
import { resolveTheme, type ThemePreference } from '@shared/theme/resolve-theme'

export function applyAppearanceToDocument(
  theme: ThemePreference,
  fontSize: FontSizePreference,
): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = resolveTheme(theme, prefersDark)
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.fontSize = fontSize
  document.documentElement.style.setProperty(
    '--ui-root-size',
    `${resolveFontRootPx(fontSize)}px`,
  )
}

export function watchSystemTheme(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (): void => onChange()
  media.addEventListener('change', handler)
  return () => media.removeEventListener('change', handler)
}

export type FontSizePreference = 'sm' | 's' | 'md' | 'l'

const ROOT_PX: Record<FontSizePreference, number> = {
  sm: 12,
  s: 13,
  md: 14,
  l: 16,
}

export function resolveFontRootPx(preference: FontSizePreference): number {
  return ROOT_PX[preference]
}

export function fontSizeLabel(preference: FontSizePreference): string {
  const labels: Record<FontSizePreference, string> = {
    sm: 'SM',
    s: 'S',
    md: 'MD',
    l: 'L',
  }
  return labels[preference]
}

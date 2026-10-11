import { describe, expect, it } from 'vitest'
import { fontSizeLabel, resolveFontRootPx } from './resolve-font-size'

describe('resolveFontRootPx', () => {
  it('maps SM/S/MD/L to blueprint root sizes', () => {
    expect(resolveFontRootPx('sm')).toBe(12)
    expect(resolveFontRootPx('s')).toBe(13)
    expect(resolveFontRootPx('md')).toBe(14)
    expect(resolveFontRootPx('l')).toBe(16)
  })
})

describe('fontSizeLabel', () => {
  it('uses exact UI labels', () => {
    expect(fontSizeLabel('sm')).toBe('SM')
    expect(fontSizeLabel('l')).toBe('L')
  })
})

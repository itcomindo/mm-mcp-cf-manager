import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Prefer CJS preload on Windows launcher; fall back to electron-vite default .mjs. */
export function resolvePreloadPath(mainDirname: string): string {
  const preloadDir = join(mainDirname, '../preload')
  const candidates = [join(preloadDir, 'index.cjs'), join(preloadDir, 'index.mjs')]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return join(preloadDir, 'index.mjs')
}

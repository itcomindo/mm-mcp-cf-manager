import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export function appendLauncherBootLine(line: string): void {
  if (process.env.MMCF_LAUNCHER !== '1') {
    return
  }
  const base = process.env.LOCALAPPDATA
  if (!base) {
    return
  }
  try {
    const dir = join(base, 'MM-MCP-CF-Manager')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'launcher.log'), `${line}\n`, 'utf8')
  } catch {
    // ignore launcher log failures
  }
}

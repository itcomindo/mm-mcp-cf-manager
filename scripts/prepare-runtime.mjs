import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const stampPath = join(root, '.runtime-stamp')
const lockPath = join(root, 'package-lock.json')
const nodeModulesFlag = join(root, 'node_modules', '.package-lock.json')
const mainOut = join(root, 'out', 'main', 'index.js')

const SOURCE_DIRS = ['src', 'electron.vite.config.ts', 'package.json']

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function hashFile(path) {
  const data = readFileSync(path)
  return createHash('sha256').update(data).digest('hex')
}

function collectSourceFingerprint() {
  const parts = []
  for (const entry of SOURCE_DIRS) {
    const full = join(root, entry)
    if (!existsSync(full)) continue
    const stat = statSync(full)
    if (stat.isFile()) {
      parts.push(`${entry}:${hashFile(full)}`)
      continue
    }
    walk(full, (file) => {
      const rel = relative(root, file).replaceAll('\\', '/')
      if (rel.includes('node_modules')) return
      parts.push(`${rel}:${hashFile(file)}`)
    })
  }
  parts.sort()
  return createHash('sha256').update(parts.join('\n')).digest('hex')
}

function walk(dir, onFile) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, onFile)
    } else {
      onFile(full)
    }
  }
}

function readStamp() {
  if (!existsSync(stampPath)) return null
  try {
    return JSON.parse(readFileSync(stampPath, 'utf8'))
  } catch {
    return null
  }
}

function writeStamp(payload) {
  writeFileSync(stampPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function needsInstall(stamp) {
  if (!existsSync(join(root, 'node_modules'))) return true
  if (!existsSync(lockPath)) return false
  const lockHash = hashFile(lockPath)
  return stamp?.lockHash !== lockHash || !existsSync(nodeModulesFlag)
}

function needsBuild(stamp) {
  if (!existsSync(mainOut)) return true
  const sourceHash = collectSourceFingerprint()
  return stamp?.sourceHash !== sourceHash
}

const stamp = readStamp()

if (needsInstall(stamp)) {
  console.log('[prepare-runtime] Installing dependencies (npm ci)...')
  if (!existsSync(lockPath)) {
    console.error('[prepare-runtime] package-lock.json is missing. Run npm install once with network access.')
    process.exit(1)
  }
  run('npm', ['ci'])
}

if (needsBuild(stamp)) {
  console.log('[prepare-runtime] Building application...')
  run('npm', ['run', 'build'])
}

writeStamp({
  lockHash: existsSync(lockPath) ? hashFile(lockPath) : null,
  sourceHash: collectSourceFingerprint(),
  preparedAt: new Date().toISOString(),
})

console.log('[prepare-runtime] Ready.')

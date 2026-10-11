import { version } from 'node:process'

const major = Number(version.slice(1).split('.')[0])
if (!Number.isFinite(major) || major < 24) {
  console.error(`Node.js 24+ required. Current: ${version}`)
  process.exit(1)
}

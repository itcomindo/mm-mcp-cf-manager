import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { redactUnknown, redactSensitiveText } from '@shared/logging/redact'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

export class Logger {
  private logsDir: string
  private minLevel: LogLevel

  constructor(logsDir: string, minLevel: LogLevel = 'info') {
    this.logsDir = logsDir
    this.minLevel = minLevel
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true })
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] <= LEVEL_ORDER[this.minLevel]
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(level)) return
    const safeMessage = redactSensitiveText(message)
    const entry = {
      ts: new Date().toISOString(),
      level,
      message: safeMessage,
      meta: meta === undefined ? undefined : redactUnknown(meta),
    }
    const line = `${JSON.stringify(entry)}\n`
    appendFileSync(join(this.logsDir, 'app.log'), line, 'utf8')
    if (level === 'error') {
      console.error(safeMessage, entry.meta ?? '')
    } else if (level === 'warn') {
      console.warn(safeMessage, entry.meta ?? '')
    } else {
      console.log(safeMessage, entry.meta ?? '')
    }
  }

  error(message: string, meta?: unknown): void {
    this.write('error', message, meta)
  }

  warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta)
  }

  info(message: string, meta?: unknown): void {
    this.write('info', message, meta)
  }

  debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta)
  }
}

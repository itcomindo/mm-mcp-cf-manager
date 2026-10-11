import { safeStorage } from 'electron'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type SecretsFile = {
  version: 1
  encrypted: string
}

export class CredentialService {
  private secretsPath: string

  constructor(userDataPath: string) {
    this.secretsPath = join(userDataPath, 'secrets.json')
  }

  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }

  hasToken(): boolean {
    if (!existsSync(this.secretsPath)) return false
    try {
      const parsed = JSON.parse(readFileSync(this.secretsPath, 'utf8')) as SecretsFile
      return Boolean(parsed.encrypted)
    } catch {
      return false
    }
  }

  async saveToken(plainToken: string): Promise<void> {
    if (!this.isEncryptionAvailable()) {
      throw new Error('OS encryption is not available for credential storage.')
    }
    const encrypted = await safeStorage.encryptStringAsync(plainToken)
    const payload: SecretsFile = {
      version: 1,
      encrypted: encrypted.toString('base64'),
    }
    writeFileSync(this.secretsPath, `${JSON.stringify(payload)}\n`, 'utf8')
  }

  async revealToken(): Promise<string> {
    if (!this.hasToken()) {
      throw new Error('No API token is stored.')
    }
    if (!this.isEncryptionAvailable()) {
      throw new Error('OS encryption is not available for credential storage.')
    }
    const parsed = JSON.parse(readFileSync(this.secretsPath, 'utf8')) as SecretsFile
    const buffer = Buffer.from(parsed.encrypted, 'base64')
    const decrypted = await safeStorage.decryptStringAsync(buffer)
    return decrypted.result
  }

  clearToken(): void {
    if (existsSync(this.secretsPath)) {
      unlinkSync(this.secretsPath)
    }
  }
}

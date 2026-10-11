import type { AppSettings, AppearanceSettings, BehaviorSettings } from '../schemas/settings.schema'
export type IpcSuccess<T> = { ok: true; data: T }
export type IpcFailure = {
  ok: false
  error: {
    code: string
    message: string
  }
}
export type IpcResult<T> = IpcSuccess<T> | IpcFailure

export type SettingsGetAllResult = AppSettings

export type SettingsPathsResult = {
  userDataPath: string
  databasePath: string
  logsPath: string
}

export type SettingsUpdateAppearancePayload = Partial<AppearanceSettings>
export type SettingsUpdateBehaviorPayload = Partial<BehaviorSettings>

export type SaveConnectionPayload = {
  mcpEndpoint: string
  apiToken?: string
}

export type RevealTokenResult = { token: string }
export type CopyTokenResult = { copied: true }

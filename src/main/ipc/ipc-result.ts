import type { IpcResult } from '@shared/types/ipc'

export function ipcOk<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

export function ipcErr(code: string, message: string): IpcResult<never> {
  return { ok: false, error: { code, message } }
}

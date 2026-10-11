import type { IpcResult } from '@shared/types/ipc'

export function unwrapIpc<T>(result: IpcResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error.message)
  }
  return result.data
}

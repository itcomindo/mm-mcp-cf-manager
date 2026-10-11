import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'

export type ExecuteResult<T> = {
  ok: true
  data: T
}

export type ExecuteErrorBody = {
  ok: false
  status?: number
  errors?: Array<{ message?: string; code?: number }>
}

export function parseExecuteJson<T extends Record<string, unknown>>(
  json: T | ExecuteErrorBody,
): T {
  if (typeof json === 'object' && json !== null && 'ok' in json && json.ok === false) {
    const errorBody = json as ExecuteErrorBody
    const detail = errorBody.errors?.[0]?.message ?? `HTTP ${errorBody.status ?? 'error'}`
    const err = new Error(detail)
    if (errorBody.status === 401) {
      throw Object.assign(err, {
        normalized: { code: APP_ERROR_CODES.AUTH_INVALID, message: detail },
      })
    }
    if (errorBody.status === 403) {
      throw Object.assign(err, {
        normalized: {
          code: APP_ERROR_CODES.AUTH_PERMISSION_MISSING,
          message: detail,
          httpStatus: 403,
        },
      })
    }
    throw Object.assign(err, {
      normalized: {
        code: APP_ERROR_CODES.MCP_TOOL_ERROR,
        message: detail,
        httpStatus: errorBody.status,
      },
    })
  }
  return json as T
}

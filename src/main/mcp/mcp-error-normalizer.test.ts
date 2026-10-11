import { describe, expect, it } from 'vitest'
import { normalizeMcpError } from './mcp-error-normalizer'
import { APP_ERROR_CODES } from '@shared/errors/app-error-codes'

describe('normalizeMcpError', () => {
  it('maps 401 to AUTH_INVALID', () => {
    const result = normalizeMcpError(new Error('HTTP 401 unauthorized'))
    expect(result.code).toBe(APP_ERROR_CODES.AUTH_INVALID)
  })

  it('maps 403 to AUTH_PERMISSION_MISSING', () => {
    const result = normalizeMcpError(new Error('403 insufficient_scope'))
    expect(result.code).toBe(APP_ERROR_CODES.AUTH_PERMISSION_MISSING)
  })

  it('maps rate limit to RATE_LIMITED', () => {
    const result = normalizeMcpError(new Error('429 rate limit'))
    expect(result.code).toBe(APP_ERROR_CODES.RATE_LIMITED)
    expect(result.retryable).toBe(true)
  })
})

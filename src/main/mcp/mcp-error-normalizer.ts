import { APP_ERROR_CODES, type AppErrorCode } from '@shared/errors/app-error-codes'

export type NormalizedMcpError = {
  code: AppErrorCode
  message: string
  retryable: boolean
  retryAfterMs?: number
}

export function normalizeMcpError(error: unknown): NormalizedMcpError {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (lower.includes('401') || lower.includes('invalid_token') || lower.includes('auth')) {
    return {
      code: APP_ERROR_CODES.AUTH_INVALID,
      message: 'API token is invalid or expired.',
      retryable: false,
    }
  }

  if (
    lower.includes('403') ||
    lower.includes('insufficient_scope') ||
    lower.includes('permission')
  ) {
    return {
      code: APP_ERROR_CODES.AUTH_PERMISSION_MISSING,
      message: 'API token lacks required permission for this operation.',
      retryable: false,
    }
  }

  if (lower.includes('429') || lower.includes('rate limit')) {
    return {
      code: APP_ERROR_CODES.RATE_LIMITED,
      message: 'Cloudflare rate limit reached. Try again shortly.',
      retryable: true,
      retryAfterMs: 5_000,
    }
  }

  if (
    lower.includes('timeout') ||
    lower.includes('abort') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound')
  ) {
    return {
      code: APP_ERROR_CODES.NETWORK_ERROR,
      message: 'Unable to reach Cloudflare MCP. Check your network connection.',
      retryable: true,
    }
  }

  if (lower.includes('mcp')) {
    return {
      code: APP_ERROR_CODES.MCP_PROTOCOL_ERROR,
      message: 'MCP protocol error. Verify the MCP endpoint URL.',
      retryable: false,
    }
  }

  return {
    code: APP_ERROR_CODES.UNKNOWN,
    message: 'An unexpected error occurred while contacting Cloudflare MCP.',
    retryable: false,
  }
}

export function permissionMessageForOperation(operation: 'whoami' | 'zones'): string {
  if (operation === 'whoami') {
    return 'Token lacks user or account read permission required for Test Connection.'
  }
  return 'Zone Read permission missing. The token cannot list zones.'
}

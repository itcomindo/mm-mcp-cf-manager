import { describe, expect, it } from 'vitest'
import { saveConnectionSchema } from './connection.schema'

describe('saveConnectionSchema', () => {
  it('accepts endpoint-only save', () => {
    const result = saveConnectionSchema.safeParse({
      mcpEndpoint: 'https://mcp.cloudflare.com/mcp',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid endpoint URL', () => {
    const result = saveConnectionSchema.safeParse({
      mcpEndpoint: 'not-a-url',
      apiToken: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('accepts endpoint with token', () => {
    const result = saveConnectionSchema.safeParse({
      mcpEndpoint: 'https://mcp.cloudflare.com/mcp',
      apiToken: 'token-value',
    })
    expect(result.success).toBe(true)
  })
})

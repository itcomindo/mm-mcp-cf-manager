import { describe, expect, it } from 'vitest'
import { extractZonesListExecutePayload } from './extract-zones-list-payload'

describe('extractZonesListExecutePayload', () => {
  it('reads a top-level result array', () => {
    const out = extractZonesListExecutePayload({
      result: [{ id: 'z1', name: 'a.test' }],
      result_info: { total_count: 1 },
    })
    expect(out.batch).toHaveLength(1)
    expect(out.result_info?.total_count).toBe(1)
  })

  it('reads nested Cloudflare API shape', () => {
    const out = extractZonesListExecutePayload({
      result: {
        result: [{ id: 'z2', name: 'b.test' }],
        result_info: { total_count: 2, total_pages: 1 },
      },
    })
    expect(out.batch).toHaveLength(1)
    expect(out.result_info?.total_count).toBe(2)
  })
})

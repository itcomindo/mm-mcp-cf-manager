import type { CloudflareListPage } from '@shared/cloudflare/zone-pagination'

type ExecuteZonesPayload = {
  result?: unknown
  result_info?: CloudflareListPage['result_info'] | null
  zones?: unknown[]
}

/** Normalize execute JSON into a zone batch + pagination meta (MCP/CF shapes vary). */
export function extractZonesListExecutePayload(json: ExecuteZonesPayload): {
  batch: unknown[]
  result_info: CloudflareListPage['result_info'] | undefined
} {
  if (Array.isArray(json.zones)) {
    return { batch: json.zones, result_info: json.result_info ?? undefined }
  }

  if (Array.isArray(json.result)) {
    return { batch: json.result, result_info: json.result_info ?? undefined }
  }

  if (json.result && typeof json.result === 'object' && !Array.isArray(json.result)) {
    const inner = json.result as {
      result?: unknown[]
      result_info?: CloudflareListPage['result_info']
    }
    if (Array.isArray(inner.result)) {
      return {
        batch: inner.result,
        result_info: inner.result_info ?? json.result_info ?? undefined,
      }
    }
  }

  return { batch: [], result_info: json.result_info ?? undefined }
}

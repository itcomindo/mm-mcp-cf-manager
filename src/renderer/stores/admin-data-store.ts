import { create } from 'zustand'
import type { AdminDataPopoverResult } from '@shared/schemas/admin-data.schema'
import { unwrapIpc } from '@renderer/lib/mmcf-client'

type PopoverCacheEntry = AdminDataPopoverResult | 'empty' | 'loading'

type AdminDataState = {
  popoverCache: Map<string, PopoverCacheEntry>
  loadPopover: (zoneId: string) => Promise<AdminDataPopoverResult | null>
  invalidateZone: (zoneId: string) => void
  invalidateAll: () => void
}

export const useAdminDataStore = create<AdminDataState>((set, get) => ({
  popoverCache: new Map(),

  loadPopover: async (zoneId: string) => {
    const cached = get().popoverCache.get(zoneId)
    if (cached && cached !== 'loading') {
      return cached === 'empty' ? null : cached
    }

    const next = new Map(get().popoverCache)
    next.set(zoneId, 'loading')
    set({ popoverCache: next })

    try {
      const result = unwrapIpc(await window.mmcf.adminData.getPopover({ zoneId }))
      const updated = new Map(get().popoverCache)
      if (result.items.length === 0) {
        updated.set(zoneId, 'empty')
        set({ popoverCache: updated })
        return null
      }
      updated.set(zoneId, result)
      set({ popoverCache: updated })
      return result
    } catch {
      const updated = new Map(get().popoverCache)
      updated.set(zoneId, 'empty')
      set({ popoverCache: updated })
      return null
    }
  },

  invalidateZone: (zoneId: string) => {
    const next = new Map(get().popoverCache)
    next.delete(zoneId)
    set({ popoverCache: next })
  },

  invalidateAll: () => {
    set({ popoverCache: new Map() })
  },
}))

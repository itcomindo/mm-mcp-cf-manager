import { create } from 'zustand'
import type { ZoneSummary } from '@shared/schemas/zones.schema'
import { unwrapIpc } from '../lib/mmcf-client'

type ZonesState = {
  zones: ZoneSummary[]
  loading: boolean
  error: string | null
  hydrate: () => Promise<void>
  setZones: (zones: ZoneSummary[]) => void
}

export const useZonesStore = create<ZonesState>((set) => ({
  zones: [],
  loading: true,
  error: null,
  hydrate: async () => {
    set({ loading: true, error: null })
    try {
      const result = unwrapIpc(await window.mmcf.zones.list())
      set({ zones: result.zones, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load zones',
      })
    }
  },
  setZones: (zones) => set({ zones }),
}))

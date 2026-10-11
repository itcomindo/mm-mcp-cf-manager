import { create } from 'zustand'
import type { ConnectionStatus } from '@shared/schemas/connection.schema'
import { unwrapIpc } from '../lib/mmcf-client'

type ConnectionState = {
  status: ConnectionStatus | null
  loading: boolean
  error: string | null
  hydrate: () => Promise<void>
  setStatus: (status: ConnectionStatus) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: null,
  loading: true,
  error: null,
  hydrate: async () => {
    set({ loading: true, error: null })
    try {
      const status = unwrapIpc(await window.mmcf.connection.getStatus())
      set({ status, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load connection status',
      })
    }
  },
  setStatus: (status) => set({ status }),
}))

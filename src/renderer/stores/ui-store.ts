import { create } from 'zustand'

export type MainTab =
  | 'overview'
  | 'dns'
  | 'cache'
  | 'security'
  | 'waf'
  | 'activity'
  | 'adminData'
export type AppView = 'main' | 'settings'

type UiState = {
  view: AppView
  activeTab: MainTab
  selectedZoneIds: string[]
  openedZoneId: string | null
  setView: (view: AppView) => void
  setActiveTab: (tab: MainTab) => void
  toggleZoneSelection: (zoneId: string) => void
  clearSelection: () => void
  setOpenedZone: (zoneId: string | null) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  view: 'main',
  activeTab: 'overview',
  selectedZoneIds: [],
  openedZoneId: null,
  setView: (view) => set({ view }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleZoneSelection: (zoneId) => {
    const current = get().selectedZoneIds
    if (current.includes(zoneId)) {
      set({ selectedZoneIds: current.filter((id) => id !== zoneId) })
    } else {
      set({ selectedZoneIds: [...current, zoneId] })
    }
  },
  clearSelection: () => set({ selectedZoneIds: [] }),
  setOpenedZone: (zoneId) => set({ openedZoneId: zoneId }),
}))

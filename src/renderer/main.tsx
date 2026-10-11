import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { useConnectionStore } from './stores/connection-store'
import { useSettingsStore } from './stores/settings-store'
import { useZonesStore } from './stores/zones-store'
import './styles/globals.css'

async function bootstrap(): Promise<void> {
  await useSettingsStore.getState().hydrate()
  await Promise.all([
    useConnectionStore.getState().hydrate(),
    useZonesStore.getState().hydrate(),
  ])
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('Root element #root not found')
  }
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()

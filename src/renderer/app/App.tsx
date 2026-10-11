import type { JSX } from 'react'
import { AppShell } from '@renderer/components/layout/AppShell'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { ThemeSync } from './ThemeSync'

export function App(): JSX.Element {
  const loading = useSettingsStore((s) => s.loading)
  const error = useSettingsStore((s) => s.error)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-[var(--danger)]">
        {error}
      </div>
    )
  }

  return (
    <>
      <ThemeSync />
      <AppShell />
    </>
  )
}

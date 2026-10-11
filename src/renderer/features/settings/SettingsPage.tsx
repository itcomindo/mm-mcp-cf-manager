import { useEffect, useState, type JSX } from 'react'
import type { FontSizePreference } from '@shared/theme/resolve-font-size'
import type { ThemePreference } from '@shared/theme/resolve-theme'
import { fontSizeLabel } from '@shared/theme/resolve-font-size'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { Button } from '@renderer/components/ui/Button'
import { ConnectionPanel } from './ConnectionPanel'
import { IpAccessPanel } from './IpAccessPanel'

type SettingsSection = 'connection' | 'ipWhitelist' | 'appearance' | 'behavior' | 'data' | 'about'

const fontOptions: FontSizePreference[] = ['sm', 's', 'md', 'l']
const themeOptions: ThemePreference[] = ['system', 'light', 'dark']

export function SettingsPage({ onBack }: { onBack: () => void }): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const patchAppearance = useSettingsStore((s) => s.patchAppearance)
  const patchBehavior = useSettingsStore((s) => s.patchBehavior)
  const resetUiPreferences = useSettingsStore((s) => s.resetUiPreferences)
  const [section, setSection] = useState<SettingsSection>('connection')
  const [version, setVersion] = useState('0.1.0')
  const [paths, setPaths] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const v = unwrapIpc(await window.mmcf.app.getVersion())
        setVersion(v.version)
        const p = unwrapIpc(await window.mmcf.settings.getPaths())
        setPaths(p.userDataPath)
      } catch {
        /* non-fatal for Phase 1 */
      }
    })()
  }, [])

  if (!settings) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-muted-foreground">
        Loading settings…
      </div>
    )
  }

  const showMessage = (text: string): void => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 2000)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <h2 className="text-[1.1em] font-semibold">{strings.settings.title}</h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
      </div>
      {message ? (
        <p className="border-b border-border bg-surface-elevated px-4 py-2 text-[0.9em] text-foreground">
          {message}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <nav className="w-48 shrink-0 border-r border-border bg-surface p-2">
          {(Object.keys(strings.settings.nav) as SettingsSection[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-[0.95em] ${
                section === key
                  ? 'bg-sidebar-active text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {strings.settings.nav[key]}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-auto p-4">
          {section === 'connection' ? (
            <ConnectionPanel
              onMessage={showMessage}
              onError={(text) => {
                setMessage(text)
                window.setTimeout(() => setMessage(null), 4000)
              }}
            />
          ) : null}

          {section === 'ipWhitelist' ? (
            <IpAccessPanel
              onMessage={showMessage}
              onError={(text) => {
                setMessage(text)
                window.setTimeout(() => setMessage(null), 4000)
              }}
            />
          ) : null}

          {section === 'appearance' ? (
            <div className="max-w-xl space-y-4">
              <div>
                <p className="mb-2 font-medium">{strings.settings.appearance.theme}</p>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((theme) => (
                    <Button
                      key={theme}
                      size="sm"
                      variant={settings.appearance.theme === theme ? 'primary' : 'secondary'}
                      onClick={() => {
                        void patchAppearance({ theme }).then(() => showMessage(strings.settings.saved))
                      }}
                    >
                      {theme === 'system'
                        ? strings.settings.appearance.themeSystem
                        : theme === 'light'
                          ? strings.settings.appearance.themeLight
                          : strings.settings.appearance.themeDark}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-medium">{strings.settings.appearance.fontSize}</p>
                <div className="flex flex-wrap gap-2">
                  {fontOptions.map((fontSize) => (
                    <Button
                      key={fontSize}
                      size="sm"
                      variant={settings.appearance.fontSize === fontSize ? 'primary' : 'secondary'}
                      onClick={() => {
                        void patchAppearance({ fontSize }).then(() =>
                          showMessage(strings.settings.saved),
                        )
                      }}
                    >
                      {fontSizeLabel(fontSize)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {section === 'behavior' ? (
            <div className="max-w-xl space-y-4">
              <label className="block">
                <span className="mb-1 block text-[0.9em]">
                  {strings.settings.behavior.bulkConcurrency}
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={settings.behavior.bulkConcurrency}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    void patchBehavior({ bulkConcurrency: value }).then(() =>
                      showMessage(strings.settings.saved),
                    )
                  }}
                  className="w-24 rounded-md border border-border bg-input px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[0.9em]">{strings.settings.behavior.maxRetries}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={settings.behavior.maxRetries}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    void patchBehavior({ maxRetries: value }).then(() =>
                      showMessage(strings.settings.saved),
                    )
                  }}
                  className="w-24 rounded-md border border-border bg-input px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.behavior.dryRun}
                  onChange={(event) => {
                    void patchBehavior({ dryRun: event.target.checked }).then(() =>
                      showMessage(strings.settings.saved),
                    )
                  }}
                />
                <span>{strings.settings.behavior.dryRun}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.behavior.confirmSingleHighImpact}
                  onChange={(event) => {
                    void patchBehavior({ confirmSingleHighImpact: event.target.checked }).then(
                      () => showMessage(strings.settings.saved),
                    )
                  }}
                />
                <span>{strings.settings.behavior.confirmSingle}</span>
              </label>
              <p className="text-[0.9em] text-muted-foreground">
                {strings.settings.behavior.confirmBulkNote}
              </p>
            </div>
          ) : null}

          {section === 'data' ? (
            <div className="max-w-xl space-y-3">
              <p className="text-[0.9em] text-muted-foreground">{strings.settings.data.paths}</p>
              {paths ? (
                <p className="break-all rounded-md border border-border bg-surface px-2 py-1 text-[0.85em]">
                  {paths}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    void window.mmcf.settings.openUserDataFolder()
                  }}
                >
                  {strings.settings.data.openFolder}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    void resetUiPreferences().then(() => showMessage(strings.settings.saved))
                  }}
                >
                  {strings.settings.data.resetUi}
                </Button>
              </div>
            </div>
          ) : null}

          {section === 'about' ? (
            <div className="max-w-xl space-y-2 text-[0.95em]">
              <p className="text-lg font-semibold">{strings.appName}</p>
              <p>Version {version}</p>
              <p>{strings.settings.about.license}</p>
              <p>{strings.settings.about.free}</p>
              <p className="text-muted-foreground">{strings.settings.about.unofficial}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

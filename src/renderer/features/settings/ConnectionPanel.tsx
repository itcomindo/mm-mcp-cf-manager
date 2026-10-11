import { useEffect, useState, type JSX } from 'react'
import { DEFAULT_MCP_ENDPOINT } from '@shared/constants/mcp'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { useConnectionStore } from '@renderer/stores/connection-store'
import { useZonesStore } from '@renderer/stores/zones-store'
import { formatTimestamp } from '@renderer/lib/format-timestamp'
import { Button } from '@renderer/components/ui/Button'

type ConnectionPanelProps = {
  onMessage: (text: string) => void
  onError: (text: string) => void
}

export function ConnectionPanel({ onMessage, onError }: ConnectionPanelProps): JSX.Element {
  const status = useConnectionStore((s) => s.status)
  const setStatus = useConnectionStore((s) => s.setStatus)
  const hydrateZones = useZonesStore((s) => s.hydrate)

  const [endpoint, setEndpoint] = useState(DEFAULT_MCP_ENDPOINT)
  const [draftToken, setDraftToken] = useState('')
  const [tokenVisible, setTokenVisible] = useState(false)
  const [visibleToken, setVisibleToken] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (status?.mcpEndpoint) {
      setEndpoint(status.mcpEndpoint)
    }
  }, [status?.mcpEndpoint])

  const run = async (label: string, action: () => Promise<void>): Promise<void> => {
    setBusy(label)
    try {
      await action()
    } finally {
      setBusy(null)
    }
  }

  const tokenValue = tokenVisible && visibleToken !== null ? visibleToken : draftToken

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label className="mb-1 block text-[0.9em]">{strings.settings.connection.mcpEndpoint}</label>
        <input
          value={endpoint}
          onChange={(event) => setEndpoint(event.target.value)}
          className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-foreground"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="mb-1 block text-[0.9em]">{strings.settings.connection.apiToken}</label>
        <input
          type={tokenVisible ? 'text' : 'password'}
          value={tokenValue}
          onChange={(event) => {
            setDraftToken(event.target.value)
            if (tokenVisible) setVisibleToken(event.target.value)
          }}
          placeholder={
            status?.hasStoredToken && !draftToken
              ? strings.settings.connection.tokenStoredPlaceholder
              : strings.settings.connection.tokenEmptyPlaceholder
          }
          className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-foreground"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={Boolean(busy) || !status?.hasStoredToken}
            onClick={() => {
              void run('show', async () => {
                if (tokenVisible) {
                  setTokenVisible(false)
                  setVisibleToken(null)
                  return
                }
                try {
                  const result = unwrapIpc(await window.mmcf.connection.revealToken())
                  setVisibleToken(result.token)
                  setTokenVisible(true)
                } catch (error) {
                  onError(error instanceof Error ? error.message : strings.settings.error)
                }
              })
            }}
          >
            {tokenVisible ? strings.settings.connection.hide : strings.settings.connection.show}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={Boolean(busy) || !status?.hasStoredToken}
            onClick={() => {
              void run('copy', async () => {
                try {
                  unwrapIpc(await window.mmcf.connection.copyTokenToClipboard())
                  onMessage(strings.settings.connection.tokenCopied)
                } catch (error) {
                  onError(error instanceof Error ? error.message : strings.settings.error)
                }
              })
            }}
          >
            {strings.settings.connection.copy}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface-elevated p-3 text-[0.9em]">
        <p>
          <span className="text-muted-foreground">{strings.settings.connection.statusLabel}: </span>
          {status?.isConnected
            ? strings.settings.connection.connected
            : strings.settings.connection.disconnected}
        </p>
        <p>
          <span className="text-muted-foreground">{strings.settings.connection.identity}: </span>
          {status?.identityLabel ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">{strings.settings.connection.zonesCount}: </span>
          {status?.zonesCount ?? 0}
        </p>
        <p>
          <span className="text-muted-foreground">{strings.settings.connection.freeZonesCount}: </span>
          {status?.freeZonesCount ?? 0}
        </p>
        <p>
          <span className="text-muted-foreground">{strings.settings.connection.lastSync}: </span>
          {formatTimestamp(status?.lastZoneSyncAt ?? null)}
        </p>
        <p>
          <span className="text-muted-foreground">{strings.settings.connection.lastMcpSuccess}: </span>
          {formatTimestamp(status?.lastSuccessfulMcpRequestAt ?? null)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          loading={busy === 'save'}
          onClick={() => {
            void run('save', async () => {
              try {
                const payload: { mcpEndpoint: string; apiToken?: string } = { mcpEndpoint: endpoint }
                if (draftToken.trim()) payload.apiToken = draftToken.trim()
                const next = unwrapIpc(await window.mmcf.connection.save(payload))
                setStatus(next)
                setDraftToken('')
                setTokenVisible(false)
                setVisibleToken(null)
                onMessage(strings.settings.saved)
              } catch (error) {
                onError(error instanceof Error ? error.message : strings.settings.error)
              }
            })
          }}
        >
          {strings.settings.connection.save}
        </Button>
        <Button
          variant="secondary"
          loading={busy === 'test'}
          onClick={() => {
            void run('test', async () => {
              try {
                const next = unwrapIpc(await window.mmcf.connection.test())
                setStatus(next)
                onMessage(strings.settings.connection.testSuccess)
              } catch (error) {
                onError(error instanceof Error ? error.message : strings.settings.connection.testFailed)
              }
            })
          }}
        >
          {strings.settings.connection.testConnection}
        </Button>
        <Button
          variant="secondary"
          loading={busy === 'sync'}
          title={strings.settings.connection.syncZonesTitle}
          onClick={() => {
            void run('sync', async () => {
              try {
                const result = unwrapIpc(await window.mmcf.connection.syncZones())
                setStatus(result.status)
                await hydrateZones()
                onMessage(strings.settings.connection.syncSuccess(result.syncedCount))
              } catch (error) {
                onError(error instanceof Error ? error.message : strings.settings.connection.syncFailed)
              }
            })
          }}
        >
          {strings.settings.connection.syncZones}
        </Button>
        <Button
          variant="destructive"
          loading={busy === 'disconnect'}
          onClick={() => {
            void run('disconnect', async () => {
              try {
                const next = unwrapIpc(await window.mmcf.connection.disconnect())
                setStatus(next)
                setDraftToken('')
                setTokenVisible(false)
                setVisibleToken(null)
                onMessage(strings.settings.connection.disconnectedMessage)
              } catch (error) {
                onError(error instanceof Error ? error.message : strings.settings.error)
              }
            })
          }}
        >
          {strings.settings.connection.disconnect}
        </Button>
      </div>
    </div>
  )
}

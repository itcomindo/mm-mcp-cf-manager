import { useCallback, useEffect, useState, type JSX } from 'react'
import type { IpAccessRule } from '@shared/schemas/ip-access.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { writeDisabledReason } from '@renderer/lib/capability-ui'
import { formatTimestamp } from '@renderer/lib/format-timestamp'
import { useConnectionStore } from '@renderer/stores/connection-store'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { Button } from '@renderer/components/ui/Button'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'
import { SimpleTable } from '@renderer/components/ui/SimpleTable'

type IpAccessPanelProps = {
  onMessage: (text: string) => void
  onError: (text: string) => void
}

export function IpAccessPanel({ onMessage, onError }: IpAccessPanelProps): JSX.Element {
  const status = useConnectionStore((s) => s.status)
  const hydrateConnection = useConnectionStore((s) => s.hydrate)
  const dryRun = useSettingsStore((s) => s.settings?.behavior.dryRun ?? false)

  const [accountIds, setAccountIds] = useState<string[]>([])
  const [accountId, setAccountId] = useState<string>('')
  const [rules, setRules] = useState<IpAccessRule[]>([])
  const [showAllModes, setShowAllModes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftIp, setDraftIp] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [pendingDelete, setPendingDelete] = useState<IpAccessRule | null>(null)

  const tokenReady = status?.tokenConfigured ?? false
  const readState = status?.accountIpAccessRead
  const writeState = status?.accountIpAccessWrite
  const writeReason = writeDisabledReason(writeState)

  const loadAccounts = useCallback(async () => {
    const { accountIds: ids } = unwrapIpc(await window.mmcf.ipAccess.getAccounts())
    setAccountIds(ids)
    if (ids.length === 1) {
      setAccountId(ids[0]!)
    }
  }, [])

  const loadRules = useCallback(async () => {
    if (!tokenReady) return
    setLoading(true)
    setError(null)
    try {
      const result = unwrapIpc(
        await window.mmcf.ipAccess.list({
          accountId: accountId || undefined,
          mode: showAllModes ? 'all' : 'whitelist',
        }),
      )
      setRules(result.rules)
      if (!accountId) setAccountId(result.accountId)
      await hydrateConnection()
    } catch (err) {
      const message = err instanceof Error ? err.message : strings.settings.ipWhitelist.loadFailed
      setError(message)
      onError(message)
      await hydrateConnection()
    } finally {
      setLoading(false)
    }
  }, [accountId, hydrateConnection, onError, showAllModes, tokenReady])

  useEffect(() => {
    if (!tokenReady) return
    void loadAccounts().catch(() => undefined)
  }, [loadAccounts, tokenReady])

  useEffect(() => {
    if (!tokenReady) return
    if (accountIds.length > 1 && !accountId) return
    void loadRules()
  }, [accountId, accountIds.length, loadRules, tokenReady, showAllModes])

  const onAdd = (): void => {
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const result = unwrapIpc(
          await window.mmcf.ipAccess.create({
            accountId: accountId || undefined,
            ip: draftIp,
            notes: draftNotes.trim() || undefined,
          }),
        )
        onMessage(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setDraftIp('')
        setDraftNotes('')
        await loadRules()
      } catch (err) {
        const message = err instanceof Error ? err.message : strings.write.actionFailed
        setError(message)
        onError(message)
        await hydrateConnection()
      } finally {
        setBusy(false)
      }
    })()
  }

  const onConfirmDelete = (): void => {
    if (!pendingDelete) return
    const rule = pendingDelete
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const result = unwrapIpc(
          await window.mmcf.ipAccess.delete({
            accountId: accountId || undefined,
            ruleId: rule.id,
          }),
        )
        onMessage(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setPendingDelete(null)
        await loadRules()
      } catch (err) {
        const message = err instanceof Error ? err.message : strings.write.actionFailed
        setError(message)
        onError(message)
        await hydrateConnection()
      } finally {
        setBusy(false)
      }
    })()
  }

  if (!tokenReady) {
    return (
      <p className="max-w-xl text-[0.95em] text-muted-foreground">
        {strings.settings.ipWhitelist.notConnected}
      </p>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-[0.95em] text-muted-foreground">{strings.settings.ipWhitelist.intro}</p>
      <p className="text-[0.85em] text-muted-foreground">{strings.settings.ipWhitelist.tokenHint}</p>

      {readState === 'permission_missing' ? (
        <p className="text-[0.9em] text-[var(--danger)]">{strings.settings.ipWhitelist.readMissing}</p>
      ) : null}
      {writeState === 'permission_missing' ? (
        <p className="text-[0.9em] text-[var(--danger)]">{strings.settings.ipWhitelist.writeMissing}</p>
      ) : null}
      {error ? <p className="text-[0.9em] text-[var(--danger)]">{error}</p> : null}

      {accountIds.length > 1 ? (
        <label className="block max-w-md">
          <span className="mb-1 block text-[0.9em]">{strings.settings.ipWhitelist.accountLabel}</span>
          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="w-full rounded-md border border-border bg-input px-2 py-1.5"
          >
            <option value="">{strings.settings.ipWhitelist.accountPlaceholder}</option>
            {accountIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" loading={loading} onClick={() => void loadRules()}>
          {strings.settings.ipWhitelist.refresh}
        </Button>
        <label className="flex items-center gap-2 text-[0.9em]">
          <input
            type="checkbox"
            checked={showAllModes}
            onChange={(event) => setShowAllModes(event.target.checked)}
          />
          {strings.settings.ipWhitelist.showAllModes}
        </label>
        {dryRun ? (
          <span className="text-[0.85em] text-muted-foreground">{strings.write.dryRunNotice}</span>
        ) : null}
      </div>

      <div className="rounded-md border border-border bg-surface-elevated p-3">
        <div className="flex flex-wrap gap-2">
          <label className="min-w-[12rem] flex-1">
            <span className="mb-1 block text-[0.85em]">{strings.settings.ipWhitelist.ipLabel}</span>
            <input
              value={draftIp}
              onChange={(event) => setDraftIp(event.target.value)}
              placeholder={strings.settings.ipWhitelist.ipPlaceholder}
              className="w-full rounded-md border border-border bg-input px-2 py-1.5"
            />
          </label>
          <label className="min-w-[12rem] flex-[2]">
            <span className="mb-1 block text-[0.85em]">{strings.settings.ipWhitelist.notesLabel}</span>
            <input
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              className="w-full rounded-md border border-border bg-input px-2 py-1.5"
            />
          </label>
        </div>
        <Button
          className="mt-3"
          size="sm"
          loading={busy}
          disabled={Boolean(writeReason) || draftIp.trim().length === 0}
          title={writeReason ?? undefined}
          onClick={onAdd}
        >
          {strings.settings.ipWhitelist.addWhitelist}
        </Button>
        {writeReason ? (
          <p className="mt-2 text-[0.85em] text-muted-foreground">
            {writeState === 'unknown' || writeState === 'loading'
              ? strings.settings.ipWhitelist.refreshListFirst
              : writeReason}
          </p>
        ) : null}
      </div>

      <SimpleTable
        rows={rules}
        emptyMessage={loading ? strings.zoneTabs.loading : strings.settings.ipWhitelist.empty}
        columns={[
          {
            key: 'ip',
            header: strings.settings.ipWhitelist.columns.ip,
            render: (row) => row.configurationValue,
          },
          {
            key: 'mode',
            header: strings.settings.ipWhitelist.columns.mode,
            render: (row) => row.mode,
          },
          {
            key: 'notes',
            header: strings.settings.ipWhitelist.columns.notes,
            render: (row) => row.notes ?? '—',
          },
          {
            key: 'created',
            header: strings.settings.ipWhitelist.columns.created,
            render: (row) => formatTimestamp(row.createdOn),
          },
          {
            key: 'actions',
            header: strings.settings.ipWhitelist.columns.actions,
            render: (row) => (
              <Button
                size="sm"
                variant="destructive"
                disabled={Boolean(writeReason)}
                title={writeReason ?? undefined}
                onClick={() => setPendingDelete(row)}
              >
                {strings.settings.ipWhitelist.remove}
              </Button>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={strings.settings.ipWhitelist.removeConfirmTitle}
        message={
          pendingDelete
            ? strings.settings.ipWhitelist.removeConfirmMessage(pendingDelete.configurationValue)
            : ''
        }
        confirmLabel={strings.settings.ipWhitelist.remove}
        cancelLabel={strings.write.cancel}
        destructive
        loading={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  )
}

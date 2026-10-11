import { useCallback, useEffect, useState, type JSX } from 'react'
import type { WafRule, ZoneOverview } from '@shared/schemas/zone-read.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { writeDisabledReason } from '@renderer/lib/capability-ui'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { Button } from '@renderer/components/ui/Button'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'
import { SimpleTable } from '@renderer/components/ui/SimpleTable'

type WafTabProps = {
  zoneId: string
  onZoneMutated?: () => void
}

type WafForm = {
  description: string
  expression: string
  action: 'block' | 'challenge' | 'js_challenge' | 'managed_challenge' | 'log' | 'skip'
  enabled: boolean
}

const emptyWafForm = (): WafForm => ({
  description: '',
  expression: '',
  action: 'block',
  enabled: true,
})

export function WafTab({ zoneId, onZoneMutated }: WafTabProps): JSX.Element {
  const confirmHighImpact = useSettingsStore(
    (s) => s.settings?.behavior.confirmSingleHighImpact ?? true,
  )
  const dryRun = useSettingsStore((s) => s.settings?.behavior.dryRun ?? false)

  const [rules, setRules] = useState<WafRule[]>([])
  const [readState, setReadState] = useState('unknown')
  const [overview, setOverview] = useState<ZoneOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<WafForm>(emptyWafForm())
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WafRule | null>(null)

  const writeReason = writeDisabledReason(overview?.capabilities?.wafWrite)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listResult, ov] = await Promise.all([
        window.mmcf.waf.listRules(zoneId),
        window.mmcf.zones.getOverview(zoneId),
      ])
      const parsed = unwrapIpc(listResult)
      setRules(parsed.rules)
      setReadState(parsed.readState)
      setOverview(unwrapIpc(ov))
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.zoneTabs.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [zoneId])

  useEffect(() => {
    void load()
  }, [load])

  const submitForm = (): void => {
    void (async () => {
      setBusy(true)
      setNotice(null)
      setError(null)
      try {
        const payload = {
          zoneId,
          description: form.description.trim(),
          expression: form.expression.trim(),
          action: form.action,
          enabled: form.enabled,
        }
        const result = editId
          ? unwrapIpc(await window.mmcf.waf.updateRule({ ...payload, ruleId: editId }))
          : unwrapIpc(await window.mmcf.waf.createRule(payload))
        setNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setForm(emptyWafForm())
        setEditId(null)
        onZoneMutated?.()
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.write.actionFailed)
      } finally {
        setBusy(false)
      }
    })()
  }

  const toggleRule = (rule: WafRule, enabled: boolean): void => {
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const result = unwrapIpc(
          await window.mmcf.waf.setRuleEnabled({ zoneId, ruleId: rule.id, enabled }),
        )
        setNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        onZoneMutated?.()
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.write.actionFailed)
      } finally {
        setBusy(false)
      }
    })()
  }

  const deleteRule = (rule: WafRule): void => {
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const result = unwrapIpc(await window.mmcf.waf.deleteRule({ zoneId, ruleId: rule.id }))
        setNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setDeleteTarget(null)
        onZoneMutated?.()
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.write.actionFailed)
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className="space-y-3">
      {dryRun ? (
        <p className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-[0.85em] text-muted-foreground">
          {strings.write.dryRunNotice}
        </p>
      ) : null}
      {notice ? <p className="text-[0.9em] text-[var(--success)]">{notice}</p> : null}
      <p className="text-[0.85em] text-muted-foreground">
        {strings.zoneTabs.readState}: {strings.capabilities.stateLabel(readState)}
      </p>
      <div className="rounded-md border border-border p-3">
        <p className="mb-2 font-medium">
          {editId ? strings.write.edit : strings.write.wafAddTitle}
        </p>
        <div className="grid gap-2">
          <input
            placeholder="Description"
            className="rounded-md border border-border bg-input px-2 py-1"
            value={form.description}
            disabled={Boolean(writeReason) || busy}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            placeholder="Expression"
            className="rounded-md border border-border bg-input px-2 py-1"
            value={form.expression}
            disabled={Boolean(writeReason) || busy}
            onChange={(e) => setForm((f) => ({ ...f, expression: e.target.value }))}
          />
          <select
            className="rounded-md border border-border bg-input px-2 py-1"
            value={form.action}
            disabled={Boolean(writeReason) || busy}
            onChange={(e) =>
              setForm((f) => ({ ...f, action: e.target.value as WafForm['action'] }))
            }
          >
            <option value="block">block</option>
            <option value="challenge">challenge</option>
            <option value="js_challenge">js_challenge</option>
            <option value="managed_challenge">managed_challenge</option>
            <option value="log">log</option>
            <option value="skip">skip</option>
          </select>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            disabled={
              Boolean(writeReason) ||
              busy ||
              !form.description.trim() ||
              !form.expression.trim()
            }
            loading={busy}
            title={writeReason ?? undefined}
            onClick={submitForm}
          >
            {editId ? strings.write.save : strings.write.add}
          </Button>
          {editId ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setEditId(null)
                setForm(emptyWafForm())
              }}
            >
              {strings.write.cancel}
            </Button>
          ) : null}
        </div>
      </div>
      {loading ? <p className="text-muted-foreground">{strings.zoneTabs.loading}</p> : null}
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      {!loading && !error ? (
        <SimpleTable
          rows={rules}
          emptyMessage={strings.zoneTabs.wafEmpty}
          columns={[
            {
              key: 'desc',
              header: strings.zoneTabs.wafColumns.description,
              render: (r) => r.description ?? '—',
            },
            {
              key: 'expr',
              header: strings.zoneTabs.wafColumns.expression,
              render: (r) => r.expression ?? '—',
            },
            {
              key: 'action',
              header: strings.zoneTabs.wafColumns.action,
              render: (r) => r.action ?? '—',
            },
            {
              key: 'enabled',
              header: strings.zoneTabs.wafColumns.enabled,
              render: (r) =>
                r.enabled === null ? '—' : r.enabled ? strings.common.yes : strings.common.no,
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(writeReason) || busy}
                    onClick={() =>
                      toggleRule(r, !(r.enabled ?? false))
                    }
                  >
                    {r.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(writeReason) || busy}
                    onClick={() => {
                      setEditId(r.id)
                      setForm({
                        description: r.description ?? '',
                        expression: r.expression ?? '',
                        action: (r.action as WafForm['action']) ?? 'block',
                        enabled: r.enabled ?? true,
                      })
                    }}
                  >
                    {strings.write.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(writeReason) || busy}
                    onClick={() => {
                      if (confirmHighImpact) setDeleteTarget(r)
                      else deleteRule(r)
                    }}
                  >
                    {strings.write.delete}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null && confirmHighImpact}
        title={strings.write.deleteWafTitle}
        message={strings.write.deleteWafMessage(deleteTarget?.description ?? deleteTarget?.id ?? '')}
        confirmLabel={strings.write.delete}
        cancelLabel={strings.write.cancel}
        destructive
        loading={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRule(deleteTarget)
        }}
      />
    </div>
  )
}

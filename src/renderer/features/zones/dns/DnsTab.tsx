import { useCallback, useEffect, useState, type JSX } from 'react'
import type { DnsRecord, ZoneOverview } from '@shared/schemas/zone-read.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { writeDisabledReason } from '@renderer/lib/capability-ui'
import { useSettingsStore } from '@renderer/stores/settings-store'
import { Button } from '@renderer/components/ui/Button'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'
import { SimpleTable } from '@renderer/components/ui/SimpleTable'

type DnsTabProps = {
  zoneId: string
  onZoneMutated?: () => void
}

type DnsForm = {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT'
  name: string
  content: string
  ttl: number
  proxied: boolean
}

const emptyForm = (): DnsForm => ({
  type: 'A',
  name: '',
  content: '',
  ttl: 1,
  proxied: true,
})

export function DnsTab({ zoneId, onZoneMutated }: DnsTabProps): JSX.Element {
  const confirmHighImpact = useSettingsStore(
    (s) => s.settings?.behavior.confirmSingleHighImpact ?? true,
  )
  const dryRun = useSettingsStore((s) => s.settings?.behavior.dryRun ?? false)

  const [records, setRecords] = useState<DnsRecord[]>([])
  const [overview, setOverview] = useState<ZoneOverview | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<DnsForm>(emptyForm())
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DnsRecord | null>(null)

  const writeReason = writeDisabledReason(overview?.capabilities?.dnsWrite)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listResult, ov] = await Promise.all([
        window.mmcf.dns.list({ zoneId, search: search.trim() || undefined }),
        window.mmcf.zones.getOverview(zoneId),
      ])
      setRecords(unwrapIpc(listResult).records)
      setOverview(unwrapIpc(ov))
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.zoneTabs.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [zoneId, search])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const submitForm = (): void => {
    void (async () => {
      setBusy(true)
      setNotice(null)
      setError(null)
      try {
        const payload = {
          zoneId,
          type: form.type,
          name: form.name.trim(),
          content: form.content.trim(),
          ttl: form.ttl,
          proxied: form.type === 'TXT' ? undefined : form.proxied,
        }
        const result = editId
          ? unwrapIpc(await window.mmcf.dns.update({ ...payload, recordId: editId }))
          : unwrapIpc(await window.mmcf.dns.create(payload))
        setNotice(result.dryRun ? strings.write.dryRunNotice : strings.write.success)
        setForm(emptyForm())
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

  const deleteRecord = (record: DnsRecord): void => {
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        const result = unwrapIpc(
          await window.mmcf.dns.delete({ zoneId, recordId: record.id }),
        )
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
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={strings.zoneTabs.dnsSearchPlaceholder}
        className="w-full max-w-md rounded-md border border-border bg-input px-2 py-1.5"
      />
      <div className="rounded-md border border-border p-3">
        <p className="mb-2 font-medium">
          {editId ? strings.write.edit : strings.write.dnsAddTitle}
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-[0.85em]">
            Type
            <select
              className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1"
              value={form.type}
              disabled={Boolean(writeReason) || busy}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as DnsForm['type'] }))
              }
            >
              <option value="A">A</option>
              <option value="AAAA">AAAA</option>
              <option value="CNAME">CNAME</option>
              <option value="TXT">TXT</option>
            </select>
          </label>
          <label className="text-[0.85em]">
            Name
            <input
              className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1"
              value={form.name}
              disabled={Boolean(writeReason) || busy}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="text-[0.85em] md:col-span-2">
            Content
            <input
              className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1"
              value={form.content}
              disabled={Boolean(writeReason) || busy}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </label>
          <label className="text-[0.85em]">
            TTL
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-border bg-input px-2 py-1"
              value={form.ttl}
              disabled={Boolean(writeReason) || busy}
              onChange={(e) => setForm((f) => ({ ...f, ttl: Number(e.target.value) || 1 }))}
            />
          </label>
          {form.type !== 'TXT' ? (
            <label className="flex items-center gap-2 text-[0.85em]">
              <input
                type="checkbox"
                checked={form.proxied}
                disabled={Boolean(writeReason) || busy}
                onChange={(e) => setForm((f) => ({ ...f, proxied: e.target.checked }))}
              />
              Proxied
            </label>
          ) : null}
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            disabled={Boolean(writeReason) || busy || !form.name.trim() || !form.content.trim()}
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
                setForm(emptyForm())
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
          rows={records}
          emptyMessage={strings.zoneTabs.dnsEmpty}
          columns={[
            { key: 'type', header: strings.zoneTabs.dnsColumns.type, render: (r) => r.type },
            { key: 'name', header: strings.zoneTabs.dnsColumns.name, render: (r) => r.name },
            {
              key: 'content',
              header: strings.zoneTabs.dnsColumns.content,
              render: (r) => r.content,
            },
            {
              key: 'proxy',
              header: strings.zoneTabs.dnsColumns.proxy,
              render: (r) =>
                r.proxied === null ? '—' : r.proxied ? strings.common.yes : strings.common.no,
            },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(writeReason) || busy}
                    title={writeReason ?? undefined}
                    onClick={() => {
                      setEditId(r.id)
                      setForm({
                        type: r.type as DnsForm['type'],
                        name: r.name,
                        content: r.content,
                        ttl: r.ttl ?? 1,
                        proxied: r.proxied ?? false,
                      })
                    }}
                  >
                    {strings.write.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(writeReason) || busy}
                    title={writeReason ?? undefined}
                    onClick={() => {
                      if (confirmHighImpact) setDeleteTarget(r)
                      else deleteRecord(r)
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
        title={strings.write.deleteDnsTitle}
        message={strings.write.deleteDnsMessage(deleteTarget?.name ?? '')}
        confirmLabel={strings.write.delete}
        cancelLabel={strings.write.cancel}
        destructive
        loading={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRecord(deleteTarget)
        }}
      />
    </div>
  )
}

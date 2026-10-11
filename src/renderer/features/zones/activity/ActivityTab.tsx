import { useEffect, useState, type JSX } from 'react'
import type { ActivityEntry } from '@shared/schemas/activity.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { SimpleTable } from '@renderer/components/ui/SimpleTable'

type ActivityTabProps = {
  zoneId: string
  refreshToken?: number
}

export function ActivityTab({ zoneId, refreshToken = 0 }: ActivityTabProps): JSX.Element {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const result = unwrapIpc(await window.mmcf.activity.list({ zoneId }))
        setEntries(result.entries)
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.zoneTabs.loadFailed)
      } finally {
        setLoading(false)
      }
    })()
  }, [zoneId, refreshToken])

  if (loading) return <p className="text-muted-foreground">{strings.zoneTabs.loading}</p>
  if (error) return <p className="text-[var(--danger)]">{error}</p>

  return (
    <SimpleTable
      rows={entries}
      emptyMessage={strings.zoneTabs.activityEmpty}
      columns={[
        {
          key: 'time',
          header: strings.activity.columns.time,
          render: (row) => row.createdAt,
        },
        { key: 'action', header: strings.activity.columns.action, render: (row) => row.action },
        { key: 'target', header: strings.activity.columns.target, render: (row) => row.target ?? '—' },
        {
          key: 'prev',
          header: strings.activity.columns.previous,
          render: (row) => row.previousValue ?? '—',
        },
        {
          key: 'new',
          header: strings.activity.columns.newValue,
          render: (row) => row.newValue ?? '—',
        },
        {
          key: 'status',
          header: strings.activity.columns.status,
          render: (row) => strings.activity.statusLabel(row.status),
        },
        {
          key: 'error',
          header: strings.activity.columns.error,
          render: (row) => row.errorSummary ?? '—',
        },
      ]}
    />
  )
}

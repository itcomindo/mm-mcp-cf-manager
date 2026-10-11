import { useEffect, useState, type JSX } from 'react'
import type { BulkActionKind, BulkPreviewResult } from '@shared/schemas/tasks.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { ConfirmDialog } from '@renderer/components/ui/ConfirmDialog'

type BulkPreviewModalProps = {
  open: boolean
  action: BulkActionKind | null
  zoneIds: string[]
  onClose: () => void
  onStarted: (taskId: string) => void
}

export function BulkPreviewModal({
  open,
  action,
  zoneIds,
  onClose,
  onStarted,
}: BulkPreviewModalProps): JSX.Element | null {
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !action || zoneIds.length === 0) {
      setPreview(null)
      return
    }
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setPreview(unwrapIpc(await window.mmcf.bulk.preview({ action, zoneIds })))
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.bulk.previewFailed)
      } finally {
        setLoading(false)
      }
    })()
  }, [open, action, zoneIds])

  if (!open || !action) return null

  const execute = (): void => {
    void (async () => {
      setExecuting(true)
      setError(null)
      try {
        const { taskId } = unwrapIpc(
          await window.mmcf.bulk.createTask({ action, zoneIds }),
        )
        onStarted(taskId)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.bulk.startFailed)
      } finally {
        setExecuting(false)
      }
    })()
  }

  return (
    <ConfirmDialog
      open={open}
      title={strings.bulk.previewTitle}
      message={
        <div className="space-y-2 text-left">
          {loading ? <p>{strings.zoneTabs.loading}</p> : null}
          {error ? <p className="text-[var(--danger)]">{error}</p> : null}
          {preview ? (
            <>
              <p>
                <span className="text-muted-foreground">{strings.bulk.actionLabel}: </span>
                {preview.actionLabel}
              </p>
              <p>
                {strings.bulk.selectedZones}: {preview.total}
              </p>
              <ul className="text-[0.9em]">
                <li>
                  {strings.bulk.eligible}: {preview.eligible}
                </li>
                <li>
                  {strings.bulk.permissionMissing}: {preview.permissionMissing}
                </li>
                <li>
                  {strings.bulk.unsupported}: {preview.unsupported}
                </li>
              </ul>
              <details className="text-[0.85em]">
                <summary>{strings.bulk.viewDomains}</summary>
                <ul className="mt-2 max-h-40 overflow-auto">
                  {preview.zones.map((zone) => (
                    <li key={zone.zoneId}>
                      {zone.domain} — {zone.eligibility}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : null}
        </div>
      }
      confirmLabel={strings.bulk.execute}
      cancelLabel={strings.write.cancel}
      loading={executing}
      destructive={action === 'cache.purge_everything'}
      onCancel={onClose}
      onConfirm={execute}
    />
  )
}

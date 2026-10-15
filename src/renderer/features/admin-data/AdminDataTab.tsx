import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import type { AdminDataField, AdminDataFieldType } from '@shared/schemas/admin-data.schema'
import { strings } from '@renderer/strings/en'
import { unwrapIpc } from '@renderer/lib/mmcf-client'
import { useAdminDataStore } from '@renderer/stores/admin-data-store'
import { Button } from '@renderer/components/ui/Button'

type AdminDataTabProps = {
  zoneId: string | null
  domain: string | null
}

export function AdminDataTab({ zoneId, domain }: AdminDataTabProps): JSX.Element {
  const [fields, setFields] = useState<AdminDataField[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const saveTimerRef = useRef<number | null>(null)

  const invalidateZone = useAdminDataStore((s) => s.invalidateZone)
  const invalidateAll = useAdminDataStore((s) => s.invalidateAll)

  const loadFields = useCallback(async () => {
    const result = unwrapIpc(await window.mmcf.adminData.listFields())
    setFields(result.fields)
    return result.fields
  }, [])

  const loadZoneValues = useCallback(async (id: string) => {
    const result = unwrapIpc(await window.mmcf.adminData.getZoneValues({ zoneId: id }))
    setValues(result.values)
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await loadFields()
        if (zoneId) {
          await loadZoneValues(zoneId)
        } else {
          setValues({})
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : strings.adminData.loadFailed)
      } finally {
        setLoading(false)
      }
    })()
  }, [zoneId, loadFields, loadZoneValues])

  const scheduleSave = useCallback(
    (id: string, nextValues: Record<string, string>) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
      setSaveState('saving')
      saveTimerRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            unwrapIpc(
              await window.mmcf.adminData.saveZoneValues({ zoneId: id, values: nextValues }),
            )
            setSaveState('saved')
            invalidateZone(id)
            window.setTimeout(() => setSaveState('idle'), 1500)
          } catch {
            setSaveState('error')
          }
        })()
      }, 400)
    },
    [invalidateZone],
  )

  const onValueChange = (fieldId: string, value: string): void => {
    if (!zoneId) return
    setValues((prev) => {
      const next = { ...prev, [fieldId]: value }
      scheduleSave(zoneId, next)
      return next
    })
  }

  const addField = async (fieldType: AdminDataFieldType): Promise<void> => {
    setTypeMenuOpen(false)
    try {
      const label =
        fieldType === 'text'
          ? strings.adminData.fieldTypes.text
          : strings.adminData.fieldTypes.textarea
      const created = unwrapIpc(
        await window.mmcf.adminData.createField({ label, fieldType }),
      )
      setFields((prev) => [...prev, created])
      invalidateAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.adminData.saveFailed)
    }
  }

  const updateFieldLabel = async (fieldId: string, label: string): Promise<void> => {
    const trimmed = label.trim()
    if (!trimmed) return
    try {
      const updated = unwrapIpc(await window.mmcf.adminData.updateField({ fieldId, label: trimmed }))
      setFields((prev) => prev.map((f) => (f.fieldId === fieldId ? updated : f)))
      invalidateAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.adminData.saveFailed)
    }
  }

  const removeField = async (fieldId: string): Promise<void> => {
    if (!window.confirm(strings.adminData.deleteFieldConfirm)) return
    try {
      unwrapIpc(await window.mmcf.adminData.deleteField({ fieldId }))
      setFields((prev) => prev.filter((f) => f.fieldId !== fieldId))
      setValues((prev) => {
        const next = { ...prev }
        delete next[fieldId]
        return next
      })
      invalidateAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.adminData.saveFailed)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">{strings.zoneTabs.loading}</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-medium">{strings.adminData.fieldsSection}</h3>
            <p className="text-[0.85em] text-muted-foreground">{strings.adminData.fieldsSectionHint}</p>
          </div>
          <div className="relative">
            <Button size="sm" variant="secondary" onClick={() => setTypeMenuOpen((open) => !open)}>
              {strings.adminData.addData}
            </Button>
            {typeMenuOpen ? (
              <div className="absolute right-0 z-10 mt-1 min-w-[10rem] rounded-md border border-border bg-surface-elevated py-1 shadow-lg">
                <p className="px-2 py-1 text-[0.75em] text-muted-foreground">
                  {strings.adminData.chooseFieldType}
                </p>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-[0.9em] hover:bg-muted"
                  onClick={() => void addField('text')}
                >
                  {strings.adminData.fieldTypes.text}
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-[0.9em] hover:bg-muted"
                  onClick={() => void addField('textarea')}
                >
                  {strings.adminData.fieldTypes.textarea}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {fields.length === 0 ? (
          <p className="text-[0.9em] text-muted-foreground">{strings.adminData.noFieldsYet}</p>
        ) : (
          <ul className="space-y-2">
            {fields.map((field) => (
              <li
                key={field.fieldId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
              >
                <input
                  type="text"
                  defaultValue={field.label}
                  aria-label={strings.adminData.fieldLabel}
                  className="min-w-[8rem] flex-1 rounded border border-border bg-input px-2 py-1 text-[0.9em]"
                  onBlur={(event) => {
                    if (event.target.value !== field.label) {
                      void updateFieldLabel(field.fieldId, event.target.value)
                    }
                  }}
                />
                <span className="rounded bg-muted px-1.5 py-0.5 text-[0.75em] text-muted-foreground">
                  {field.fieldType === 'text'
                    ? strings.adminData.fieldTypes.text
                    : strings.adminData.fieldTypes.textarea}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void removeField(field.fieldId)}
                >
                  {strings.adminData.removeField}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">
            {domain && zoneId
              ? strings.adminData.valuesSectionFor(domain)
              : strings.adminData.valuesSection}
          </h3>
          {zoneId && saveState === 'saving' ? (
            <span className="text-[0.8em] text-muted-foreground">…</span>
          ) : null}
          {zoneId && saveState === 'saved' ? (
            <span className="text-[0.8em] text-[var(--success)]">{strings.adminData.saved}</span>
          ) : null}
          {zoneId && saveState === 'error' ? (
            <span className="text-[0.8em] text-[var(--danger)]">{strings.adminData.saveFailed}</span>
          ) : null}
        </div>

        {!zoneId ? (
          <p className="text-[0.9em] text-muted-foreground">{strings.adminData.noZoneSelected}</p>
        ) : fields.length === 0 ? (
          <p className="text-[0.9em] text-muted-foreground">{strings.adminData.noFieldsYet}</p>
        ) : (
          <div className="space-y-4">
            {fields.map((field) => (
              <label key={field.fieldId} className="block">
                <span className="mb-1 block text-[0.9em] font-medium">{field.label}</span>
                {field.fieldType === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={values[field.fieldId] ?? ''}
                    onChange={(event) => onValueChange(field.fieldId, event.target.value)}
                    className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-[0.9em]"
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field.fieldId] ?? ''}
                    onChange={(event) => onValueChange(field.fieldId, event.target.value)}
                    className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-[0.9em]"
                  />
                )}
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

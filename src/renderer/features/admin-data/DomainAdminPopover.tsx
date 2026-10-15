import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { AdminDataPopoverItem } from '@shared/schemas/admin-data.schema'
import { strings } from '@renderer/strings/en'
import { formatTimestamp } from '@renderer/lib/format-timestamp'
import { useAdminDataStore } from '@renderer/stores/admin-data-store'

const SHOW_DELAY_MS = 250
const HIDE_DELAY_MS = 150
const POPOVER_MAX_HEIGHT_PX = 224

type DomainAdminPopoverProps = {
  zoneId: string
  domain: string
  detailRefreshedAt: string | null
  lastSyncedAt: string | null
  children: ReactNode
  onOpenZone: () => void
}

type PopoverPosition = {
  top: number
  left: number
  maxWidth: number
}

function computePosition(anchor: DOMRect): PopoverPosition {
  const margin = 8
  const maxWidth = Math.min(320, window.innerWidth - margin * 2)
  let left = anchor.right + margin
  if (left + maxWidth > window.innerWidth - margin) {
    left = Math.max(margin, anchor.left - maxWidth - margin)
  }
  if (left < margin) {
    left = margin
  }
  let top = anchor.top
  if (top + POPOVER_MAX_HEIGHT_PX > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - POPOVER_MAX_HEIGHT_PX - margin)
  }
  return { top, left, maxWidth }
}

export function DomainAdminPopover({
  zoneId,
  domain,
  detailRefreshedAt,
  lastSyncedAt,
  children,
  onOpenZone,
}: DomainAdminPopoverProps): JSX.Element {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [adminItems, setAdminItems] = useState<AdminDataPopoverItem[]>([])
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const showTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const loadPopover = useAdminDataStore((s) => s.loadPopover)

  const clearTimers = (): void => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const hide = useCallback((): void => {
    clearTimers()
    setVisible(false)
    setAdminItems([])
    setPosition(null)
  }, [])

  const show = useCallback((): void => {
    clearTimers()
    showTimerRef.current = window.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition(computePosition(rect))
      setVisible(true)
      setAdminItems([])
      void loadPopover(zoneId).then((result) => {
        if (result?.items.length) {
          setAdminItems(result.items)
        }
      })
    }, SHOW_DELAY_MS)
  }, [loadPopover, zoneId])

  const scheduleHide = (): void => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = window.setTimeout(() => hide(), HIDE_DELAY_MS)
  }

  const cancelHide = (): void => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  useEffect(() => () => clearTimers(), [])

  const onAnchorClick = (event: ReactMouseEvent): void => {
    event.stopPropagation()
    onOpenZone()
  }

  const detailLine = detailRefreshedAt
    ? strings.sidebar.detailRefreshedTitle(formatTimestamp(detailRefreshedAt))
    : strings.sidebar.notDetailRefreshedTitle

  return (
    <>
      <span
        ref={anchorRef}
        className="min-w-0 flex-1"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        <button
          type="button"
          className="w-full min-w-0 cursor-pointer truncate text-left text-[0.95em]"
          onClick={onAnchorClick}
        >
          {children}
        </button>
      </span>
      {visible && position
        ? createPortal(
            <div
              role="tooltip"
              className="fixed z-[100] rounded-md border border-border bg-surface-elevated p-2 shadow-lg"
              style={{
                top: position.top,
                left: position.left,
                maxWidth: position.maxWidth,
                maxHeight: `${POPOVER_MAX_HEIGHT_PX}px`,
              }}
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
            >
              <p className="mb-1.5 truncate text-[0.8em] font-semibold text-foreground">{domain}</p>
              <dl className="space-y-1 text-[0.75em] text-muted-foreground">
                <div>
                  <dt className="sr-only">{strings.adminData.popoverSyncSection}</dt>
                  <dd>{detailLine}</dd>
                </div>
                {lastSyncedAt ? (
                  <div>
                    <dd>{strings.sidebar.lastSyncedTitle(formatTimestamp(lastSyncedAt))}</dd>
                  </div>
                ) : null}
              </dl>
              {adminItems.length > 0 ? (
                <>
                  <div className="my-2 border-t border-border" />
                  <p className="mb-1 text-[0.7em] font-semibold uppercase tracking-wide text-muted-foreground">
                    {strings.adminData.popoverTitle}
                  </p>
                  <dl className="max-h-28 space-y-1.5 overflow-y-auto text-[0.8em]">
                    {adminItems.map((item) => (
                      <div key={item.fieldId}>
                        <dt className="font-medium text-foreground">{item.label}</dt>
                        <dd className="whitespace-pre-wrap break-words text-muted-foreground">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

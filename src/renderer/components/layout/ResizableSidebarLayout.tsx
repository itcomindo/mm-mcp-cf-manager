import {
  useCallback,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  SIDEBAR_WIDTH_DEFAULT_PX,
  SIDEBAR_WIDTH_MAX_PX,
  SIDEBAR_WIDTH_MIN_PX,
} from '@shared/schemas/settings.schema'
import { strings } from '@renderer/strings/en'
import { useSettingsStore } from '@renderer/stores/settings-store'

function clampSidebarWidth(px: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX_PX, Math.max(SIDEBAR_WIDTH_MIN_PX, Math.round(px)))
}

type ResizableSidebarLayoutProps = {
  sidebar: ReactNode
  children: ReactNode
}

export function ResizableSidebarLayout({
  sidebar,
  children,
}: ResizableSidebarLayoutProps): JSX.Element {
  const storedWidth =
    useSettingsStore((s) => s.settings?.appearance.sidebarWidthPx) ?? SIDEBAR_WIDTH_DEFAULT_PX
  const patchAppearance = useSettingsStore((s) => s.patchAppearance)

  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const widthPx = dragWidth ?? storedWidth

  const endDrag = useCallback(
    (commitWidth: number): void => {
      dragRef.current = null
      setDragWidth(null)
      document.body.style.userSelect = ''
      const clamped = clampSidebarWidth(commitWidth)
      if (clamped !== storedWidth) {
        void patchAppearance({ sidebarWidthPx: clamped })
      }
    },
    [patchAppearance, storedWidth],
  )

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return
    event.preventDefault()
    dragRef.current = { startX: event.clientX, startWidth: widthPx }
    setDragWidth(widthPx)
    document.body.style.userSelect = 'none'
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current
    if (!drag) return
    const delta = event.clientX - drag.startX
    setDragWidth(clampSidebarWidth(drag.startWidth + delta))
  }

  const onHandlePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current) return
    const delta = event.clientX - dragRef.current.startX
    const finalWidth = clampSidebarWidth(dragRef.current.startWidth + delta)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    endDrag(finalWidth)
  }

  const onHandlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    endDrag(dragRef.current.startWidth)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div
        className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-surface"
        style={{ width: widthPx, minWidth: SIDEBAR_WIDTH_MIN_PX, maxWidth: SIDEBAR_WIDTH_MAX_PX }}
      >
        {sidebar}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={strings.sidebar.resizeHandle}
        className="w-1 shrink-0 cursor-col-resize touch-none bg-border/60 hover:bg-primary/40 active:bg-primary/50"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerCancel}
      />
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}

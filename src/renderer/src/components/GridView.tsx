import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category, Flag, PhotoEntry } from '@shared/types'
import { usePreview } from '../hooks/usePreview'
import { orientationTransformCss } from '../lib/orientationCss'
import { createSharedObserver, type SharedObserver } from '../lib/sharedIntersectionObserver'
import { useLanguage } from '../i18n/LanguageContext'

const DRAG_THRESHOLD_PX = 4

function GridCell({
  photo,
  flag,
  categories,
  selected,
  observer,
  registerNode
}: {
  photo: PhotoEntry
  flag: Flag
  categories: Category[]
  selected: boolean
  observer: SharedObserver
  registerNode: (path: string, node: HTMLButtonElement | null) => void
}): React.JSX.Element {
  const [inView, setInView] = useState(false)
  const preview = usePreview(photo.path, inView)
  const url = preview !== 'loading' && preview.source !== 'fallback-icon' ? preview.url : undefined
  const orientation = preview !== 'loading' && preview.source === 'embedded' ? preview.orientation : undefined
  const category = flag ? categories.find((c) => c.id === flag) : undefined

  const cellRef = useCallback(
    (node: HTMLButtonElement | null) => {
      registerNode(photo.path, node)
      if (!node) return
      observer.observe(node, () => setInView(true))
    },
    [observer, photo.path, registerNode]
  )

  return (
    <button
      ref={cellRef}
      type="button"
      className={`grid-cell ${selected ? 'selected' : ''}`}
      style={{ borderColor: category?.color ?? 'transparent' }}
      data-path={photo.path}
      title={photo.name}
    >
      {url ? (
        <img src={url} alt={photo.name} draggable={false} style={{ transform: orientationTransformCss(orientation) }} />
      ) : (
        <div className="thumb-placeholder" />
      )}
      <span className="grid-cell-name">{photo.name}</span>
    </button>
  )
}

interface DragState {
  startClientX: number
  startClientY: number
  startPath: string | null
  additive: boolean
  shiftRange: boolean
  moved: boolean
  baseSelection: Set<string>
}

export default function GridView({
  photos,
  flags,
  categories,
  selectedPaths,
  onSelectionChange,
  onOpenPhoto
}: {
  photos: PhotoEntry[]
  flags: Record<string, Flag>
  categories: Category[]
  selectedPaths: Set<string>
  onSelectionChange: (paths: Set<string>) => void
  onOpenPhoto: (path: string) => void
}): React.JSX.Element {
  const { t } = useLanguage()
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [observer, setObserver] = useState<SharedObserver | null>(null)
  const nodesRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const dragRef = useRef<DragState | null>(null)
  const anchorRef = useRef<string | null>(null)
  const [dragBox, setDragBox] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null)

  useEffect(() => {
    if (!container) return
    const obs = createSharedObserver(container)
    setObserver(obs)
    return () => {
      obs.disconnect()
      setObserver(null)
    }
  }, [container])

  const registerNode = useCallback((path: string, node: HTMLButtonElement | null) => {
    if (node) nodesRef.current.set(path, node)
    else nodesRef.current.delete(path)
  }, [])

  const pathAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY)
    const cell = el?.closest('[data-path]')
    return cell?.getAttribute('data-path') ?? null
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const startPath = pathAtPoint(e.clientX, e.clientY)
      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPath,
        additive: e.metaKey || e.ctrlKey,
        shiftRange: e.shiftKey,
        moved: false,
        baseSelection: new Set(selectedPaths)
      }
    },
    [pathAtPoint, selectedPaths]
  )

  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      const drag = dragRef.current
      if (!drag) return

      const dx = e.clientX - drag.startClientX
      const dy = e.clientY - drag.startClientY
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      drag.moved = true

      const box = {
        left: Math.min(drag.startClientX, e.clientX),
        right: Math.max(drag.startClientX, e.clientX),
        top: Math.min(drag.startClientY, e.clientY),
        bottom: Math.max(drag.startClientY, e.clientY)
      }
      setDragBox(box)

      const inBox = new Set<string>()
      for (const [path, node] of nodesRef.current) {
        const rect = node.getBoundingClientRect()
        const intersects = rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top
        if (intersects) inBox.add(path)
      }

      const next = drag.additive || drag.shiftRange ? new Set([...drag.baseSelection, ...inBox]) : inBox
      onSelectionChange(next)
    }

    function onMouseUp(): void {
      const drag = dragRef.current
      dragRef.current = null
      setDragBox(null)
      if (!drag) return

      if (drag.moved) {
        // Drag-select already applied live in onMouseMove; just fix the anchor.
        anchorRef.current = drag.startPath ?? anchorRef.current
        return
      }

      // Plain click (no meaningful drag) — select / range-select / toggle.
      if (!drag.startPath) {
        if (!drag.additive && !drag.shiftRange) onSelectionChange(new Set())
        return
      }

      if (drag.shiftRange && anchorRef.current) {
        const paths = photos.map((p) => p.path)
        const anchorIndex = paths.indexOf(anchorRef.current)
        const clickIndex = paths.indexOf(drag.startPath)
        if (anchorIndex !== -1 && clickIndex !== -1) {
          const [from, to] = anchorIndex < clickIndex ? [anchorIndex, clickIndex] : [clickIndex, anchorIndex]
          onSelectionChange(new Set(paths.slice(from, to + 1)))
          return
        }
      }

      if (drag.additive) {
        const next = new Set(drag.baseSelection)
        if (next.has(drag.startPath)) next.delete(drag.startPath)
        else next.add(drag.startPath)
        onSelectionChange(next)
        anchorRef.current = drag.startPath
        return
      }

      onSelectionChange(new Set([drag.startPath]))
      anchorRef.current = drag.startPath
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onSelectionChange, photos])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const path = pathAtPoint(e.clientX, e.clientY)
      if (path) onOpenPhoto(path)
    },
    [pathAtPoint, onOpenPhoto]
  )

  if (photos.length === 0) {
    return (
      <div className="photo-view photo-view-empty">
        <span>{t('noPhotosForFlag')}</span>
      </div>
    )
  }

  return (
    <div className="grid-view" ref={setContainer} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>
      {observer &&
        photos.map((photo) => (
          <GridCell
            key={photo.path}
            photo={photo}
            flag={flags[photo.path] ?? null}
            categories={categories}
            selected={selectedPaths.has(photo.path)}
            observer={observer}
            registerNode={registerNode}
          />
        ))}
      {dragBox && (
        <div
          className="selection-box"
          style={{
            left: dragBox.left,
            top: dragBox.top,
            width: dragBox.right - dragBox.left,
            height: dragBox.bottom - dragBox.top
          }}
        />
      )}
    </div>
  )
}

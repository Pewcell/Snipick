import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 6
const ZOOM_STEP = 0.5
const WHEEL_ZOOM_SENSITIVITY = 0.0018

export interface Point {
  x: number
  y: number
}

export interface FitBox {
  width: number
  height: number
  containerWidth: number
  containerHeight: number
}

interface ZoomPanValue {
  zoom: number
  pan: Point
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function clampPan(pan: Point, zoom: number, box: FitBox): Point {
  const maxX = Math.max((box.width * zoom - box.containerWidth) / 2, 0)
  const maxY = Math.max((box.height * zoom - box.containerHeight) / 2, 0)
  return { x: clamp(pan.x, -maxX, maxX), y: clamp(pan.y, -maxY, maxY) }
}

/**
 * Zoom/pan state lives in a ref, not useState, and is always updated as one atomic
 * {zoom, pan} value. Deriving the next pan from "the zoom/pan as of right before this
 * call" only works if that read is never stale — a functional setState-in-setState
 * (setZoom(prev => { setPan(prev => ...); return ... })) does NOT guarantee that,
 * and produced exactly this kind of drift in practice. A ref sidesteps the question
 * entirely: there is only ever one current value, read and written synchronously.
 */
export function useZoomPan(box: FitBox | null): {
  zoom: number
  pan: Point
  isDragging: boolean
  reset: () => void
  zoomIn: () => void
  zoomOut: () => void
  onWheel: (e: React.WheelEvent<HTMLElement>) => void
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void
} {
  const valueRef = useRef<ZoomPanValue>({ zoom: 1, pan: { x: 0, y: 0 } })
  const [, forceRender] = useReducer((n: number) => n + 1, 0)
  const [isDragging, setIsDragging] = useState(false)

  const boxRef = useRef(box)
  boxRef.current = box

  const dragStateRef = useRef<{ startX: number; startY: number; startPan: Point } | null>(null)

  const commit = useCallback((next: ZoomPanValue) => {
    valueRef.current = next
    forceRender()
  }, [])

  const reset = useCallback(() => {
    commit({ zoom: 1, pan: { x: 0, y: 0 } })
  }, [commit])

  const applyZoom = useCallback(
    (nextZoomRaw: number, anchor: Point | null) => {
      const currentBox = boxRef.current
      if (!currentBox) return

      const { zoom: prevZoom, pan: prevPan } = valueRef.current
      const clampedZoom = clamp(nextZoomRaw, MIN_ZOOM, MAX_ZOOM)

      let nextPan = prevPan
      if (anchor && clampedZoom !== prevZoom) {
        const ratio = clampedZoom / prevZoom
        nextPan = {
          x: anchor.x - (anchor.x - prevPan.x) * ratio,
          y: anchor.y - (anchor.y - prevPan.y) * ratio
        }
      }

      commit({ zoom: clampedZoom, pan: clampPan(nextPan, clampedZoom, currentBox) })
    },
    [commit]
  )

  const zoomIn = useCallback(() => applyZoom(valueRef.current.zoom + ZOOM_STEP, null), [applyZoom])
  const zoomOut = useCallback(() => applyZoom(valueRef.current.zoom - ZOOM_STEP, null), [applyZoom])

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const currentBox = boxRef.current
      if (!currentBox) return
      const { zoom, pan } = valueRef.current
      commit({ zoom, pan: clampPan({ x: pan.x - dx, y: pan.y - dy }, zoom, currentBox) })
    },
    [commit]
  )

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      e.preventDefault()

      // Trackpad pinch (and Ctrl+wheel on a mouse) reports as a wheel event with
      // ctrlKey set — that's always zoom. A plain two-finger trackpad swipe, or a
      // plain mouse wheel once already zoomed in, pans instead; a plain mouse wheel
      // from the fit view still zooms so scroll-to-zoom keeps working with no pinch.
      const isPinchOrCtrlZoom = e.ctrlKey
      const shouldPan = !isPinchOrCtrlZoom && valueRef.current.zoom > MIN_ZOOM

      if (shouldPan) {
        panBy(e.deltaX, e.deltaY)
        return
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const anchor: Point = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      }
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY)
      applyZoom(valueRef.current.zoom * factor, anchor)
    },
    [applyZoom, panBy]
  )

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (valueRef.current.zoom <= MIN_ZOOM) return
    e.preventDefault()
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startPan: valueRef.current.pan }
    setIsDragging(true)
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      const drag = dragStateRef.current
      const currentBox = boxRef.current
      if (!drag || !currentBox) return
      const nextPan = {
        x: drag.startPan.x + (e.clientX - drag.startX),
        y: drag.startPan.y + (e.clientY - drag.startY)
      }
      commit({ zoom: valueRef.current.zoom, pan: clampPan(nextPan, valueRef.current.zoom, currentBox) })
    }
    function onMouseUp(): void {
      dragStateRef.current = null
      setIsDragging(false)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [commit])

  return { zoom: valueRef.current.zoom, pan: valueRef.current.pan, isDragging, reset, zoomIn, zoomOut, onWheel, onMouseDown }
}

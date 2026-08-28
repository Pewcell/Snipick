import { useCallback, useRef, useState } from 'react'

export interface ElementSize {
  width: number
  height: number
}

/**
 * Returns [callbackRef, size]. A callback ref (not a plain useRef) is required here:
 * this component swaps between different DOM nodes (loading placeholder vs. the real
 * image container) across renders, and a plain ref object's identity never changes,
 * so an effect keyed on it would only ever observe the first node it saw.
 */
export function useElementSize(): [(node: HTMLElement | null) => void, ElementSize] {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const setRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])

  return [setRef, size]
}

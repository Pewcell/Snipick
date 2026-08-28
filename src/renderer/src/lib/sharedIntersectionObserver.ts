type ViewCallback = () => void

export interface SharedObserver {
  observe: (node: Element, cb: ViewCallback) => void
  unobserve: (node: Element) => void
  disconnect: () => void
}

/**
 * One IntersectionObserver shared across every grid cell instead of one per
 * cell — the standard, efficient pattern for large lists.
 *
 * `root` must be the actual scrollable ancestor (here, the grid's own
 * scroll container), not the default `root: null`. With `root: null`,
 * observers nested inside a scrolling flex/grid container never fired a
 * single callback in testing here, even for cells clearly on-screen — an
 * explicit root is what actually made intersection detection work.
 */
export function createSharedObserver(root: Element, rootMargin = '600px'): SharedObserver {
  const callbacks = new Map<Element, ViewCallback>()

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        callbacks.get(entry.target)?.()
        callbacks.delete(entry.target)
        observer.unobserve(entry.target)
      }
    },
    { root, rootMargin }
  )

  return {
    observe(node, cb) {
      callbacks.set(node, cb)
      observer.observe(node)
    },
    unobserve(node) {
      callbacks.delete(node)
      observer.unobserve(node)
    },
    disconnect() {
      observer.disconnect()
      callbacks.clear()
    }
  }
}

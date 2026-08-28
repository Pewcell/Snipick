import { useEffect } from 'react'
import type { Category } from '@shared/types'

export interface KeyboardHandlers {
  onSetCategory: (categoryId: string) => void
  onUnflag: () => void
  onNext: () => void
  onPrev: () => void
  onToggleGrid?: () => void
}

export function useKeyboardShortcuts(handlers: KeyboardHandlers, categories: Category[], enabled: boolean): void {
  useEffect(() => {
    const shortcutMap = new Map(categories.map((c) => [c.shortcut.toLowerCase(), c.id]))

    function onKeyDown(event: KeyboardEvent): void {
      // Never hijack keystrokes meant for a text field — typing "u" while naming a
      // category (e.g. "Structure") must not fire the background Unflag shortcut.
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }

      const key = event.key.toLowerCase()

      // Grid/Loupe toggle works regardless of `enabled` — it's the switch between
      // the two modes `enabled` distinguishes (category keys/arrows only make sense
      // depending on mode, handled by the caller).
      if (key === 'g' && handlers.onToggleGrid) {
        event.preventDefault()
        handlers.onToggleGrid()
        return
      }

      if (!enabled) return

      if (shortcutMap.has(key)) {
        event.preventDefault()
        handlers.onSetCategory(shortcutMap.get(key) as string)
        return
      }

      switch (key) {
        case 'u':
          event.preventDefault()
          handlers.onUnflag()
          break
        case 'arrowright':
        case ' ':
          event.preventDefault()
          handlers.onNext()
          break
        case 'arrowleft':
          event.preventDefault()
          handlers.onPrev()
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers, categories, enabled])
}

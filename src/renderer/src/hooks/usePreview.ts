import { useEffect, useState } from 'react'
import type { PreviewResult } from '@shared/types'

const previewCache = new Map<string, PreviewResult>()

export function usePreview(photoPath: string | undefined, enabled = true): PreviewResult | 'loading' {
  const [result, setResult] = useState<PreviewResult | 'loading'>(
    photoPath ? (previewCache.get(photoPath) ?? 'loading') : 'loading'
  )

  useEffect(() => {
    if (!photoPath || !enabled) return
    const cached = previewCache.get(photoPath)
    if (cached) {
      setResult(cached)
      return
    }

    let cancelled = false
    setResult('loading')
    window.sorter.getPreview(photoPath).then((preview) => {
      if (cancelled) return
      previewCache.set(photoPath, preview)
      setResult(preview)
    })

    return () => {
      cancelled = true
    }
  }, [photoPath, enabled])

  return result
}

export function prefetchPreview(photoPath: string): void {
  if (previewCache.has(photoPath)) return
  window.sorter.getPreview(photoPath).then((preview) => {
    previewCache.set(photoPath, preview)
  })
}

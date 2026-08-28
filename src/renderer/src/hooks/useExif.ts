import { useEffect, useState } from 'react'
import type { ExifSummary } from '@shared/types'

const exifCache = new Map<string, ExifSummary | null>()

export function useExif(photoPath: string | undefined): ExifSummary | null | 'loading' {
  const [result, setResult] = useState<ExifSummary | null | 'loading'>(
    photoPath && exifCache.has(photoPath) ? (exifCache.get(photoPath) ?? null) : 'loading'
  )

  useEffect(() => {
    if (!photoPath) return
    if (exifCache.has(photoPath)) {
      setResult(exifCache.get(photoPath) ?? null)
      return
    }

    let cancelled = false
    setResult('loading')
    window.sorter.getExif(photoPath).then((exif) => {
      if (cancelled) return
      exifCache.set(photoPath, exif)
      setResult(exif)
    })

    return () => {
      cancelled = true
    }
  }, [photoPath])

  return result
}

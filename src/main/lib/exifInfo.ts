import exifr from 'exifr'
import type { ExifSummary } from '@shared/types'

function formatShutterSpeed(exposureTime: number): string {
  if (exposureTime >= 1) return `${exposureTime}s`
  const denominator = Math.round(1 / exposureTime)
  return `1/${denominator}s`
}

export async function extractExifSummary(filePath: string): Promise<ExifSummary | null> {
  try {
    const meta = await exifr.parse(filePath, {
      pick: ['ISO', 'FNumber', 'ExposureTime', 'FocalLength', 'Make', 'Model']
    })
    if (!meta) return null

    const summary: ExifSummary = {}
    if (typeof meta.ISO === 'number') summary.iso = meta.ISO
    if (typeof meta.FNumber === 'number') summary.aperture = meta.FNumber
    if (typeof meta.ExposureTime === 'number') summary.shutterSpeed = formatShutterSpeed(meta.ExposureTime)
    if (typeof meta.FocalLength === 'number') summary.focalLength = Math.round(meta.FocalLength)

    const camera = [meta.Make, meta.Model].filter(Boolean).join(' ').trim()
    if (camera) summary.camera = camera

    return Object.keys(summary).length > 0 ? summary : null
  } catch {
    return null
  }
}

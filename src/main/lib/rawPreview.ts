import { open } from 'fs/promises'
import exifr from 'exifr'
import type { OrientationTransform } from '@shared/types'

const MIN_ACCEPTABLE_LONG_EDGE = 640

export interface RawPreviewResult {
  buffer: Buffer
  width?: number
  height?: number
  lowRes: boolean
  orientation?: OrientationTransform
}

function isValidJpeg(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8
}

/** Reads width/height straight from the JPEG's own SOF marker — more reliable
 * than exifr for a bare embedded preview that carries no EXIF of its own. */
function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (!isValidJpeg(buffer)) return null
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (marker === 0xd9 || marker === 0xda) break // EOI / start of scan
    const segmentLength = buffer.readUInt16BE(offset + 2)
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSOF) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
    }
    offset += 2 + segmentLength
  }
  return null
}

async function readByteRange(filePath: string, offset: number, length: number): Promise<Buffer> {
  const handle = await open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, offset)
    return buffer
  } finally {
    await handle.close()
  }
}

/**
 * Most TIFF-based RAW formats (CR2, NEF, ARW, ...) embed two JPEGs: a small
 * ~160x120 EXIF thumbnail under IFD1, and a much larger (often near
 * half-resolution) preview under IFD0 using the same JPEGInterchangeFormat
 * tags. `exifr.thumbnail()` only picks up the small IFD1 one, which is too
 * blurry to judge a shot by — so we look at both IFDs and take the bigger one.
 */
async function extractLargestOffsetPreview(filePath: string): Promise<Buffer | null> {
  const meta = await exifr.parse(filePath, { tiff: true, ifd1: true, mergeOutput: false })
  if (!meta) return null

  const candidates: { offset: number; length: number }[] = []
  for (const block of [meta.ifd0, meta.ifd1]) {
    const offset = block?.ThumbnailOffset
    const length = block?.ThumbnailLength
    if (typeof offset === 'number' && typeof length === 'number' && length > 0) {
      candidates.push({ offset, length })
    }
  }
  if (candidates.length === 0) return null

  const best = candidates.reduce((a, b) => (b.length > a.length ? b : a))
  const buffer = await readByteRange(filePath, best.offset, best.length)
  return isValidJpeg(buffer) ? buffer : null
}

/**
 * Extracts the largest embedded preview JPEG from a RAW file without doing a
 * full RAW decode. CR3 (newer Canon mirrorless) uses a non-TIFF container and
 * is known to be unreliable here — callers must treat a null return as an
 * expected, gracefully-handled case, not an error.
 */
export async function extractRawPreview(filePath: string): Promise<RawPreviewResult | null> {
  try {
    let buffer = await extractLargestOffsetPreview(filePath)

    if (!buffer) {
      const thumb = await exifr.thumbnail(filePath)
      if (thumb) {
        const fallbackBuffer = Buffer.isBuffer(thumb) ? thumb : Buffer.from(thumb)
        if (isValidJpeg(fallbackBuffer)) buffer = fallbackBuffer
      }
    }

    if (!buffer) return null

    const dimensions = readJpegDimensions(buffer)
    const longEdge = dimensions ? Math.max(dimensions.width, dimensions.height) : 0
    const lowRes = longEdge > 0 ? longEdge < MIN_ACCEPTABLE_LONG_EDGE : false

    // The extracted preview bytes are stored unrotated — the rotation needed
    // to display correctly lives in the parent RAW file's own EXIF, not in
    // the embedded preview's own (usually absent) orientation tag.
    let orientation: OrientationTransform | undefined
    try {
      const rot = await exifr.rotation(filePath)
      if (rot) {
        orientation = { deg: rot.deg, scaleX: rot.scaleX, scaleY: rot.scaleY, dimensionSwapped: rot.dimensionSwapped }
      }
    } catch {
      // Orientation is best-effort only; fall back to displaying unrotated.
    }

    return { buffer, width: dimensions?.width, height: dimensions?.height, lowRes, orientation }
  } catch (err) {
    console.error('[rawPreview] extraction failed for', filePath, err)
    return null
  }
}

import { ipcMain } from 'electron'
import { promises as fs } from 'fs'
import { extname } from 'path'
import type { PreviewResult } from '@shared/types'
import { isRawExtension } from '../lib/photoScan'
import { extractRawPreview } from '../lib/rawPreview'
import { hasCached, hashKey, readCacheMeta, writeCache } from '../lib/previewCache'

export function registerPreviewHandlers(): void {
  ipcMain.handle('sorter:getPreview', async (_event, photoPath: string): Promise<PreviewResult> => {
    const ext = extname(photoPath).toLowerCase()

    if (!isRawExtension(ext)) {
      return { url: `sorter-preview://original/${encodeURIComponent(photoPath)}`, source: 'original' }
    }

    try {
      let stat
      try {
        stat = await fs.stat(photoPath)
      } catch (err) {
        console.error('[getPreview] stat failed for', photoPath, err)
        return { url: '', source: 'fallback-icon' }
      }

      const hash = hashKey(photoPath, stat.size, stat.mtimeMs)

      if (await hasCached(hash)) {
        const meta = await readCacheMeta(hash)
        return { url: `sorter-preview://cache/${hash}`, source: 'embedded', ...meta }
      }

      const preview = await extractRawPreview(photoPath)
      if (!preview) {
        console.warn('[getPreview] no embedded preview found for', photoPath)
        return { url: '', source: 'fallback-icon' }
      }

      const meta = { width: preview.width, height: preview.height, lowRes: preview.lowRes, orientation: preview.orientation }
      await writeCache(hash, preview.buffer, meta)

      return {
        url: `sorter-preview://cache/${hash}`,
        source: 'embedded',
        ...meta
      }
    } catch (err) {
      console.error('[getPreview] unexpected error for', photoPath, err)
      return { url: '', source: 'fallback-icon' }
    }
  })
}

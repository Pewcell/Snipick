import { promises as fs } from 'fs'
import { extname, join } from 'path'
import type { PhotoEntry } from '@shared/types'

export const RASTER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']
export const RAW_EXTENSIONS = ['.cr2', '.cr3', '.nef', '.arw', '.rw2', '.orf', '.dng', '.pef', '.raf']
export const SUPPORTED_EXTENSIONS = [...RASTER_EXTENSIONS, ...RAW_EXTENSIONS]

export function isRawExtension(ext: string): boolean {
  return RAW_EXTENSIONS.includes(ext.toLowerCase())
}

export function isSupportedExtension(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(ext.toLowerCase())
}

export async function listPhotos(folderPath: string): Promise<PhotoEntry[]> {
  const dirents = await fs.readdir(folderPath, { withFileTypes: true })
  const entries: PhotoEntry[] = []

  for (const dirent of dirents) {
    if (!dirent.isFile()) continue
    // Skip hidden files, including macOS AppleDouble sidecar files (e.g. "._IMG001.ARW")
    // that macOS writes for every real file on exFAT/FAT32 volumes — they carry the
    // same extension as the real photo but contain only resource-fork metadata.
    if (dirent.name.startsWith('.')) continue
    const ext = extname(dirent.name)
    if (!isSupportedExtension(ext)) continue

    const fullPath = join(folderPath, dirent.name)
    try {
      const stat = await fs.stat(fullPath)
      entries.push({
        path: fullPath,
        name: dirent.name,
        ext: ext.toLowerCase(),
        size: stat.size,
        mtimeMs: stat.mtimeMs
      })
    } catch {
      // File disappeared or unreadable between readdir and stat; skip it.
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return entries
}

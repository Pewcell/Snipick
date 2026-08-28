import { app } from 'electron'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { OrientationTransform } from '@shared/types'

export interface PreviewCacheMeta {
  width?: number
  height?: number
  lowRes?: boolean
  orientation?: OrientationTransform
}

let cacheDirPromise: Promise<string> | null = null

async function getCacheDir(): Promise<string> {
  if (!cacheDirPromise) {
    cacheDirPromise = (async () => {
      const dir = join(app.getPath('userData'), 'previewCache')
      await fs.mkdir(dir, { recursive: true })
      return dir
    })()
  }
  return cacheDirPromise
}

export function hashKey(filePath: string, size: number, mtimeMs: number): string {
  return createHash('sha1').update(`${filePath}:${size}:${mtimeMs}`).digest('hex')
}

export async function getCachePath(hash: string): Promise<string> {
  const dir = await getCacheDir()
  return join(dir, `${hash}.jpg`)
}

async function getMetaPath(hash: string): Promise<string> {
  const dir = await getCacheDir()
  return join(dir, `${hash}.json`)
}

export async function hasCached(hash: string): Promise<boolean> {
  try {
    await fs.access(await getCachePath(hash))
    return true
  } catch {
    return false
  }
}

export async function writeCache(hash: string, buffer: Buffer, meta: PreviewCacheMeta): Promise<string> {
  const cachePath = await getCachePath(hash)
  await fs.writeFile(cachePath, buffer)
  await fs.writeFile(await getMetaPath(hash), JSON.stringify(meta), 'utf-8')
  return cachePath
}

export async function readCacheMeta(hash: string): Promise<PreviewCacheMeta> {
  try {
    const raw = await fs.readFile(await getMetaPath(hash), 'utf-8')
    return JSON.parse(raw) as PreviewCacheMeta
  } catch {
    return {}
  }
}

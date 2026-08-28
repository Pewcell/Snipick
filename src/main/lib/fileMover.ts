import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { basename, extname, join } from 'path'
import type { ApplyProgress, ApplyRequest, ApplyResult, Category, UndoResult } from '@shared/types'

interface MoveOperation {
  src: string
  dest: string
  status: 'pending' | 'success' | 'failed'
  error?: string
}

interface Manifest {
  sessionId: string
  startedAt: string
  folderPath: string
  operations: MoveOperation[]
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

const ILLEGAL_FOLDER_CHARS = /[/\\:*?"<>|]/g

export function sanitizeFolderName(name: string): string {
  const cleaned = name.replace(ILLEGAL_FOLDER_CHARS, '').trim().replace(/\.+$/, '')
  return cleaned.length > 0 ? cleaned : 'Kategori'
}

/** Maps each category id to a collision-free, sanitized folder name — two
 * categories that sanitize to the same name (e.g. "Pick!" and "Pick?") get
 * disambiguated rather than silently sharing one folder. */
function buildCategoryFolderNames(categories: Category[]): Map<string, string> {
  const claimed = new Set<string>()
  const result = new Map<string, string>()
  for (const category of categories) {
    const base = sanitizeFolderName(category.name)
    let candidate = base
    let suffix = 2
    while (claimed.has(candidate)) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    claimed.add(candidate)
    result.set(category.id, candidate)
  }
  return result
}

async function resolveCollisionFreeName(
  targetDir: string,
  fileName: string,
  claimed: Set<string>
): Promise<string> {
  const ext = extname(fileName)
  const stem = fileName.slice(0, fileName.length - ext.length)

  let candidate = fileName
  let suffix = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidatePath = join(targetDir, candidate)
    if (!claimed.has(candidatePath) && !(await pathExists(candidatePath))) {
      claimed.add(candidatePath)
      return candidate
    }
    suffix += 1
    candidate = `${stem} (${suffix})${ext}`
  }
}

async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EXDEV') {
      await fs.copyFile(src, dest)
      await fs.unlink(src)
      return
    }
    throw err
  }
}

async function writeManifest(logPath: string, manifest: Manifest): Promise<void> {
  await fs.writeFile(logPath, JSON.stringify(manifest, null, 2), 'utf-8')
}

export async function applySort(
  request: ApplyRequest,
  onProgress?: (progress: ApplyProgress) => void
): Promise<ApplyResult> {
  const { folderPath, flags, categories } = request
  const folderNames = buildCategoryFolderNames(categories)

  // Only entries whose flag matches a currently-known category are actionable —
  // a flag referencing a since-deleted category id is skipped, not moved.
  const entries = Object.entries(flags).filter(
    (entry): entry is [string, string] => entry[1] !== null && folderNames.has(entry[1])
  )

  const usedCategoryIds = new Set(entries.map(([, categoryId]) => categoryId))
  const targetDirs = new Map<string, string>()
  for (const categoryId of usedCategoryIds) {
    const dir = join(folderPath, folderNames.get(categoryId) as string)
    targetDirs.set(categoryId, dir)
    await fs.mkdir(dir, { recursive: true })
  }

  const logDir = join(folderPath, '.sorter-log')
  await fs.mkdir(logDir, { recursive: true })

  const claimed = new Set<string>()
  const operations: MoveOperation[] = []
  for (const [src, categoryId] of entries) {
    const targetDir = targetDirs.get(categoryId) as string
    const freeName = await resolveCollisionFreeName(targetDir, basename(src), claimed)
    operations.push({ src, dest: join(targetDir, freeName), status: 'pending' })
  }

  const sessionId = randomUUID()
  const startedAt = new Date().toISOString()
  const logPath = join(logDir, `apply-${startedAt.replace(/[:.]/g, '-')}.json`)
  const manifest: Manifest = { sessionId, startedAt, folderPath, operations }
  await writeManifest(logPath, manifest)

  let moved = 0
  const failures: { path: string; error: string }[] = []

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    try {
      await moveFile(op.src, op.dest)
      op.status = 'success'
      moved += 1
    } catch (err) {
      op.status = 'failed'
      op.error = err instanceof Error ? err.message : String(err)
      failures.push({ path: op.src, error: op.error })
    }

    await writeManifest(logPath, manifest)
    onProgress?.({ done: i + 1, total: operations.length, currentFile: basename(op.src) })
  }

  return { moved, failed: failures.length, failures, logPath }
}

export async function undoApply(logPath: string): Promise<UndoResult> {
  const raw = await fs.readFile(logPath, 'utf-8')
  const manifest = JSON.parse(raw) as Manifest

  let restored = 0
  const failures: { path: string; error: string }[] = []

  const successfulOps = manifest.operations.filter((op) => op.status === 'success').reverse()

  for (const op of successfulOps) {
    try {
      if (!(await pathExists(op.dest))) {
        throw new Error('moved file no longer exists at its destination')
      }
      if (await pathExists(op.src)) {
        throw new Error('original location is now occupied by another file')
      }
      await moveFile(op.dest, op.src)
      restored += 1
    } catch (err) {
      failures.push({ path: op.dest, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return { restored, failed: failures.length, failures }
}

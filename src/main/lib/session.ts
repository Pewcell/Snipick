import { promises as fs } from 'fs'
import { join } from 'path'
import type { Flag } from '@shared/types'

interface SessionFile {
  flags: Record<string, Flag>
  updatedAt: string
}

function getSessionPath(folderPath: string): string {
  return join(folderPath, '.sorter-log', 'session.json')
}

export async function loadSession(folderPath: string): Promise<Record<string, Flag> | null> {
  try {
    const raw = await fs.readFile(getSessionPath(folderPath), 'utf-8')
    const parsed = JSON.parse(raw) as SessionFile
    return parsed.flags ?? null
  } catch {
    return null
  }
}

export async function saveSession(folderPath: string, flags: Record<string, Flag>): Promise<void> {
  const sessionPath = getSessionPath(folderPath)
  await fs.mkdir(join(folderPath, '.sorter-log'), { recursive: true })
  const payload: SessionFile = { flags, updatedAt: new Date().toISOString() }
  await fs.writeFile(sessionPath, JSON.stringify(payload, null, 2), 'utf-8')
}

export async function clearSession(folderPath: string): Promise<void> {
  try {
    await fs.unlink(getSessionPath(folderPath))
  } catch {
    // Nothing to clear — fine.
  }
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { clearSession, loadSession, saveSession } from '../src/main/lib/session'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'sorter-session-test-'))
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('session persistence', () => {
  it('returns null when no session file exists yet', async () => {
    expect(await loadSession(dir)).toBeNull()
  })

  it('round-trips flags through save and load', async () => {
    const flags = { '/a/photo1.jpg': 'pick' as const, '/a/photo2.jpg': 'reject' as const }
    await saveSession(dir, flags)
    expect(await loadSession(dir)).toEqual(flags)
  })

  it('overwrites the previous save on repeated calls', async () => {
    await saveSession(dir, { '/a/photo1.jpg': 'pick' })
    await saveSession(dir, { '/a/photo1.jpg': 'reject' })
    expect(await loadSession(dir)).toEqual({ '/a/photo1.jpg': 'reject' })
  })

  it('clearSession removes the file and load then returns null', async () => {
    await saveSession(dir, { '/a/photo1.jpg': 'pick' })
    await clearSession(dir)
    expect(await loadSession(dir)).toBeNull()
  })

  it('clearSession on a folder with no session file does not throw', async () => {
    await expect(clearSession(dir)).resolves.toBeUndefined()
  })

  it('returns null instead of throwing when the session file is corrupt', async () => {
    await fs.mkdir(join(dir, '.sorter-log'), { recursive: true })
    await fs.writeFile(join(dir, '.sorter-log', 'session.json'), 'not valid json{{{')
    expect(await loadSession(dir)).toBeNull()
  })
})

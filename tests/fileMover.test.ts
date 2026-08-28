import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Category } from '../src/shared/types'
import { applySort, sanitizeFolderName, undoApply } from '../src/main/lib/fileMover'

let dir: string

const PICK: Category = { id: 'pick', name: 'Pick', color: '#16a34a', shortcut: 'p' }
const REJECT: Category = { id: 'reject', name: 'Reject', color: '#dc2626', shortcut: 'x' }
const CATEGORIES = [PICK, REJECT]

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'sorter-test-'))
})

afterEach(async () => {
  vi.restoreAllMocks()
  await fs.rm(dir, { recursive: true, force: true })
})

async function writeFile(name: string, contents = 'x'): Promise<string> {
  const p = join(dir, name)
  await fs.writeFile(p, contents)
  return p
}

describe('sanitizeFolderName', () => {
  it('strips characters illegal in folder names', () => {
    expect(sanitizeFolderName('Pick/Reject: "Best"?')).toBe('PickReject Best')
  })

  it('falls back to a default name when sanitizing leaves nothing usable', () => {
    expect(sanitizeFolderName('///???')).toBe('Kategori')
  })

  it('trims trailing dots and whitespace', () => {
    expect(sanitizeFolderName('  Maybe...  ')).toBe('Maybe')
  })
})

describe('applySort', () => {
  it('moves picked and rejected files into category folders, leaves unflagged in place', async () => {
    const pickPath = await writeFile('a.jpg')
    const rejectPath = await writeFile('b.jpg')
    const unflaggedPath = await writeFile('c.jpg')

    const result = await applySort({
      folderPath: dir,
      categories: CATEGORIES,
      flags: { [pickPath]: 'pick', [rejectPath]: 'reject', [unflaggedPath]: null }
    })

    expect(result.moved).toBe(2)
    expect(result.failed).toBe(0)
    await expect(fs.access(join(dir, 'Pick', 'a.jpg'))).resolves.toBeUndefined()
    await expect(fs.access(join(dir, 'Reject', 'b.jpg'))).resolves.toBeUndefined()
    await expect(fs.access(unflaggedPath)).resolves.toBeUndefined()
  })

  it('uses each category\'s current name as the folder name', async () => {
    const path = await writeFile('a.jpg')
    const custom: Category = { id: 'maybe', name: 'Maybe Later', color: '#a855f7', shortcut: 'm' }

    await applySort({ folderPath: dir, categories: [custom], flags: { [path]: 'maybe' } })

    await expect(fs.access(join(dir, 'Maybe Later', 'a.jpg'))).resolves.toBeUndefined()
  })

  it('disambiguates two categories that sanitize to the same folder name', async () => {
    const p1 = await writeFile('a.jpg')
    const p2 = await writeFile('b.jpg')
    const catA: Category = { id: 'a', name: 'Pick?', color: '#111', shortcut: 'a' }
    const catB: Category = { id: 'b', name: 'Pick*', color: '#222', shortcut: 'b' }

    await applySort({ folderPath: dir, categories: [catA, catB], flags: { [p1]: 'a', [p2]: 'b' } })

    await expect(fs.access(join(dir, 'Pick', 'a.jpg'))).resolves.toBeUndefined()
    await expect(fs.access(join(dir, 'Pick-2', 'b.jpg'))).resolves.toBeUndefined()
  })

  it('skips a flag that references an unknown/removed category id', async () => {
    const path = await writeFile('a.jpg')

    const result = await applySort({ folderPath: dir, categories: CATEGORIES, flags: { [path]: 'deleted-category' } })

    expect(result.moved).toBe(0)
    expect(result.failed).toBe(0)
    await expect(fs.access(path)).resolves.toBeUndefined()
  })

  it('only creates folders for categories that are actually used', async () => {
    const path = await writeFile('a.jpg')

    await applySort({ folderPath: dir, categories: CATEGORIES, flags: { [path]: 'pick' } })

    await expect(fs.access(join(dir, 'Pick'))).resolves.toBeUndefined()
    await expect(fs.access(join(dir, 'Reject'))).rejects.toThrow()
  })

  it('resolves filename collisions by appending a suffix instead of overwriting', async () => {
    await fs.mkdir(join(dir, 'Pick'), { recursive: true })
    await fs.writeFile(join(dir, 'Pick', 'a.jpg'), 'existing')
    const pickPath = await writeFile('a.jpg', 'new-content')

    const result = await applySort({ folderPath: dir, categories: CATEGORIES, flags: { [pickPath]: 'pick' } })

    expect(result.moved).toBe(1)
    const existing = await fs.readFile(join(dir, 'Pick', 'a.jpg'), 'utf-8')
    const moved = await fs.readFile(join(dir, 'Pick', 'a (1).jpg'), 'utf-8')
    expect(existing).toBe('existing')
    expect(moved).toBe('new-content')
  })

  it('continues past a per-file failure and reports it instead of aborting the batch', async () => {
    const missing = join(dir, 'does-not-exist.jpg')
    const good = await writeFile('good.jpg')

    const result = await applySort({
      folderPath: dir,
      categories: CATEGORIES,
      flags: { [missing]: 'reject', [good]: 'pick' }
    })

    expect(result.moved).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.failures[0].path).toBe(missing)
    await expect(fs.access(join(dir, 'Pick', 'good.jpg'))).resolves.toBeUndefined()
  })

  it('is idempotent when re-run on a folder that already has category dirs', async () => {
    const p1 = await writeFile('a.jpg')
    await applySort({ folderPath: dir, categories: CATEGORIES, flags: { [p1]: 'pick' } })

    const p2 = await writeFile('d.jpg')
    const result = await applySort({ folderPath: dir, categories: CATEGORIES, flags: { [p2]: 'pick' } })

    expect(result.moved).toBe(1)
    await expect(fs.access(join(dir, 'Pick', 'd.jpg'))).resolves.toBeUndefined()
  })

  it('falls back to copy+unlink when rename fails with EXDEV', async () => {
    const pickPath = await writeFile('a.jpg', 'cross-device-content')

    const renameSpy = vi.spyOn(fs, 'rename').mockImplementationOnce(async () => {
      const err = new Error('cross-device link') as NodeJS.ErrnoException
      err.code = 'EXDEV'
      throw err
    })

    const result = await applySort({ folderPath: dir, categories: CATEGORIES, flags: { [pickPath]: 'pick' } })

    expect(result.moved).toBe(1)
    expect(result.failed).toBe(0)
    await expect(fs.access(pickPath)).rejects.toThrow()
    const content = await fs.readFile(join(dir, 'Pick', 'a.jpg'), 'utf-8')
    expect(content).toBe('cross-device-content')
    renameSpy.mockRestore()
  })

  it('writes a manifest log that undoApply can use to restore files', async () => {
    const pickPath = await writeFile('a.jpg')
    const rejectPath = await writeFile('b.jpg')

    const result = await applySort({
      folderPath: dir,
      categories: CATEGORIES,
      flags: { [pickPath]: 'pick', [rejectPath]: 'reject' }
    })

    const undo = await undoApply(result.logPath)

    expect(undo.restored).toBe(2)
    expect(undo.failed).toBe(0)
    await expect(fs.access(pickPath)).resolves.toBeUndefined()
    await expect(fs.access(rejectPath)).resolves.toBeUndefined()
    await expect(fs.access(join(dir, 'Pick', 'a.jpg'))).rejects.toThrow()
  })

  it('undoApply skips restoring when the original path is now occupied, without overwriting', async () => {
    const pickPath = await writeFile('a.jpg', 'original')
    const result = await applySort({ folderPath: dir, categories: CATEGORIES, flags: { [pickPath]: 'pick' } })

    await fs.writeFile(pickPath, 'someone else wrote here')

    const undo = await undoApply(result.logPath)

    expect(undo.restored).toBe(0)
    expect(undo.failed).toBe(1)
    const content = await fs.readFile(pickPath, 'utf-8')
    expect(content).toBe('someone else wrote here')
  })
})

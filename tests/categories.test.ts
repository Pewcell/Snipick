import { afterEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Category } from '../src/shared/types'
import { loadCategories, saveCategories } from '../src/main/lib/categories'

afterEach(async () => {
  await fs.rm(join(tmpdir(), 'categories.json'), { force: true })
})

describe('categories persistence', () => {
  it('returns the default Pick/Reject categories when nothing has been saved yet', async () => {
    const categories = await loadCategories()
    expect(categories.map((c) => c.id)).toEqual(['pick', 'reject'])
  })

  it('round-trips a custom category list through save and load', async () => {
    const custom: Category[] = [
      { id: 'a', name: 'Great', color: '#111111', shortcut: 'g' },
      { id: 'b', name: 'Maybe', color: '#222222', shortcut: 'm' }
    ]
    await saveCategories(custom)
    expect(await loadCategories()).toEqual(custom)
  })

  it('falls back to defaults if the saved file is an empty array', async () => {
    await saveCategories([])
    const categories = await loadCategories()
    expect(categories.map((c) => c.id)).toEqual(['pick', 'reject'])
  })
})

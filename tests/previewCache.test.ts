import { describe, expect, it } from 'vitest'
import { hashKey } from '../src/main/lib/previewCache'

describe('hashKey', () => {
  it('is stable for the same path/size/mtime', () => {
    expect(hashKey('/a/b.cr2', 100, 12345)).toBe(hashKey('/a/b.cr2', 100, 12345))
  })

  it('changes when the file is replaced (different mtime)', () => {
    expect(hashKey('/a/b.cr2', 100, 12345)).not.toBe(hashKey('/a/b.cr2', 100, 99999))
  })

  it('changes when the path differs', () => {
    expect(hashKey('/a/b.cr2', 100, 12345)).not.toBe(hashKey('/a/c.cr2', 100, 12345))
  })
})

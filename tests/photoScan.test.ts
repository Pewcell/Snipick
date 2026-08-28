import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { listPhotos } from '../src/main/lib/photoScan'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(join(tmpdir(), 'sorter-scan-test-'))
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('listPhotos', () => {
  it('skips macOS AppleDouble sidecar files even though they share the photo extension', async () => {
    await fs.writeFile(join(dir, 'JOY00001.ARW'), 'real-raw-bytes')
    await fs.writeFile(join(dir, '._JOY00001.ARW'), 'resource-fork-metadata')
    await fs.writeFile(join(dir, '.DS_Store'), 'not-a-photo')

    const photos = await listPhotos(dir)

    expect(photos).toHaveLength(1)
    expect(photos[0].name).toBe('JOY00001.ARW')
  })

  it('ignores unsupported extensions and subdirectories', async () => {
    await fs.writeFile(join(dir, 'photo.jpg'), 'x')
    await fs.writeFile(join(dir, 'notes.txt'), 'x')
    await fs.mkdir(join(dir, 'Pick'))

    const photos = await listPhotos(dir)

    expect(photos).toHaveLength(1)
    expect(photos[0].name).toBe('photo.jpg')
  })
})

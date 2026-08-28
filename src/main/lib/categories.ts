import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { Category } from '@shared/types'

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'pick', name: 'Pick', color: '#16a34a', shortcut: 'p' },
  { id: 'reject', name: 'Reject', color: '#dc2626', shortcut: 'x' }
]

function getCategoriesPath(): string {
  return join(app.getPath('userData'), 'categories.json')
}

export async function loadCategories(): Promise<Category[]> {
  try {
    const raw = await fs.readFile(getCategoriesPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Category[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getCategoriesPath(), JSON.stringify(categories, null, 2), 'utf-8')
}

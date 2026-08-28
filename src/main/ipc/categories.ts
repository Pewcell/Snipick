import { ipcMain } from 'electron'
import type { Category } from '@shared/types'
import { loadCategories, saveCategories } from '../lib/categories'

export function registerCategoryHandlers(): void {
  ipcMain.handle('sorter:loadCategories', async () => {
    return loadCategories()
  })

  ipcMain.handle('sorter:saveCategories', async (_event, categories: Category[]) => {
    return saveCategories(categories)
  })
}

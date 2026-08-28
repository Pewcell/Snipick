import { ipcMain } from 'electron'
import type { Flag } from '@shared/types'
import { clearSession, loadSession, saveSession } from '../lib/session'

export function registerSessionHandlers(): void {
  ipcMain.handle('sorter:loadSession', async (_event, folderPath: string) => {
    return loadSession(folderPath)
  })

  ipcMain.handle('sorter:saveSession', async (_event, folderPath: string, flags: Record<string, Flag>) => {
    return saveSession(folderPath, flags)
  })

  ipcMain.handle('sorter:clearSession', async (_event, folderPath: string) => {
    return clearSession(folderPath)
  })
}

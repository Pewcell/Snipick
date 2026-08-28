import { ipcMain, type WebContents } from 'electron'
import type { ApplyRequest } from '@shared/types'
import { applySort, undoApply } from '../lib/fileMover'

export function registerApplyHandlers(): void {
  ipcMain.handle('sorter:applySort', async (event, payload: ApplyRequest) => {
    const sender: WebContents = event.sender
    return applySort(payload, (progress) => {
      sender.send('sorter:applyProgress', progress)
    })
  })

  ipcMain.handle('sorter:undoApply', async (_event, logPath: string) => {
    return undoApply(logPath)
  })
}

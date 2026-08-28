import { dialog, ipcMain } from 'electron'
import { listPhotos } from '../lib/photoScan'

export function registerFolderHandlers(): void {
  ipcMain.handle('sorter:selectFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('sorter:listPhotos', async (_event, folderPath: string) => {
    return listPhotos(folderPath)
  })
}

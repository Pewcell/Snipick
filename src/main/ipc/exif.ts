import { ipcMain } from 'electron'
import { extractExifSummary } from '../lib/exifInfo'

export function registerExifHandlers(): void {
  ipcMain.handle('sorter:getExif', async (_event, photoPath: string) => {
    return extractExifSummary(photoPath)
  })
}

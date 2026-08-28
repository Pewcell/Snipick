import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApplyProgress,
  ApplyRequest,
  Category,
  ExifSummary,
  Flag,
  PhotoEntry,
  PreviewResult,
  SorterAPI
} from '@shared/types'

const api: SorterAPI = {
  selectFolder: () => ipcRenderer.invoke('sorter:selectFolder'),
  listPhotos: (folderPath: string): Promise<PhotoEntry[]> =>
    ipcRenderer.invoke('sorter:listPhotos', folderPath),
  getPreview: (photoPath: string): Promise<PreviewResult> =>
    ipcRenderer.invoke('sorter:getPreview', photoPath),
  applySort: (payload: ApplyRequest) => ipcRenderer.invoke('sorter:applySort', payload),
  undoApply: (logPath: string) => ipcRenderer.invoke('sorter:undoApply', logPath),
  onApplyProgress: (cb: (progress: ApplyProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: ApplyProgress): void => cb(progress)
    ipcRenderer.on('sorter:applyProgress', listener)
    return () => ipcRenderer.removeListener('sorter:applyProgress', listener)
  },
  loadSession: (folderPath: string): Promise<Record<string, Flag> | null> =>
    ipcRenderer.invoke('sorter:loadSession', folderPath),
  saveSession: (folderPath: string, flags: Record<string, Flag>): Promise<void> =>
    ipcRenderer.invoke('sorter:saveSession', folderPath, flags),
  clearSession: (folderPath: string): Promise<void> => ipcRenderer.invoke('sorter:clearSession', folderPath),
  getExif: (photoPath: string): Promise<ExifSummary | null> => ipcRenderer.invoke('sorter:getExif', photoPath),
  loadCategories: (): Promise<Category[]> => ipcRenderer.invoke('sorter:loadCategories'),
  saveCategories: (categories: Category[]): Promise<void> => ipcRenderer.invoke('sorter:saveCategories', categories)
}

contextBridge.exposeInMainWorld('sorter', api)

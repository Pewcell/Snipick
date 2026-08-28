import { app, BrowserWindow, protocol, shell } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { registerFolderHandlers } from './ipc/folder'
import { registerPreviewHandlers } from './ipc/preview'
import { registerApplyHandlers } from './ipc/apply'
import { registerSessionHandlers } from './ipc/session'
import { registerExifHandlers } from './ipc/exif'
import { registerCategoryHandlers } from './ipc/categories'
import { getCachePath } from './lib/previewCache'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'sorter-preview',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
  }
])

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
}

function mimeFor(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}

function registerPreviewProtocol(): void {
  protocol.handle('sorter-preview', async (request) => {
    const url = new URL(request.url)
    const kind = url.hostname

    try {
      if (kind === 'original') {
        const filePath = decodeURIComponent(url.pathname.slice(1))
        const data = await fs.readFile(filePath)
        return new Response(data, { headers: { 'content-type': mimeFor(filePath) } })
      }

      if (kind === 'cache') {
        const hash = url.pathname.slice(1)
        const cachePath = await getCachePath(hash)
        const data = await fs.readFile(cachePath)
        return new Response(data, { headers: { 'content-type': 'image/jpeg' } })
      }
    } catch {
      return new Response(null, { status: 404 })
    }

    return new Response(null, { status: 404 })
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    backgroundColor: '#111111',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sijooyy.snipick')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerPreviewProtocol()
  registerFolderHandlers()
  registerPreviewHandlers()
  registerApplyHandlers()
  registerSessionHandlers()
  registerExifHandlers()
  registerCategoryHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

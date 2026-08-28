export interface PhotoEntry {
  path: string
  name: string
  ext: string
  size: number
  mtimeMs: number
}

export type Flag = string | null

export interface Category {
  id: string
  name: string
  color: string
  shortcut: string
}

export interface OrientationTransform {
  deg: number
  scaleX: number
  scaleY: number
  dimensionSwapped: boolean
}

export interface PreviewResult {
  url: string
  source: 'original' | 'embedded' | 'fallback-icon'
  width?: number
  height?: number
  lowRes?: boolean
  orientation?: OrientationTransform
}

export interface ApplyRequest {
  folderPath: string
  flags: Record<string, Flag>
  categories: Category[]
}

export interface ApplyFailure {
  path: string
  error: string
}

export interface ApplyResult {
  moved: number
  failed: number
  failures: ApplyFailure[]
  logPath: string
}

export interface ApplyProgress {
  done: number
  total: number
  currentFile: string
}

export interface UndoResult {
  restored: number
  failed: number
  failures: ApplyFailure[]
}

export interface ExifSummary {
  iso?: number
  aperture?: number
  shutterSpeed?: string
  focalLength?: number
  camera?: string
}

export interface SorterAPI {
  selectFolder: () => Promise<string | null>
  listPhotos: (folderPath: string) => Promise<PhotoEntry[]>
  getPreview: (photoPath: string) => Promise<PreviewResult>
  applySort: (payload: ApplyRequest) => Promise<ApplyResult>
  undoApply: (logPath: string) => Promise<UndoResult>
  onApplyProgress: (cb: (progress: ApplyProgress) => void) => () => void
  loadSession: (folderPath: string) => Promise<Record<string, Flag> | null>
  saveSession: (folderPath: string, flags: Record<string, Flag>) => Promise<void>
  clearSession: (folderPath: string) => Promise<void>
  getExif: (photoPath: string) => Promise<ExifSummary | null>
  loadCategories: () => Promise<Category[]>
  saveCategories: (categories: Category[]) => Promise<void>
}

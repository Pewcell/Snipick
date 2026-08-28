import { useEffect, useReducer, useState } from 'react'
import type { Category, Flag, PhotoEntry } from '@shared/types'
import { initialSessionState, sessionReducer, countFlags } from './state/sessionReducer'
import FolderPickerScreen from './screens/FolderPickerScreen'
import ViewerScreen, { type FlagFilter } from './screens/ViewerScreen'
import ApplyScreen from './screens/ApplyScreen'
import CategorySettings from './components/CategorySettings'

type Screen = 'picker' | 'viewer' | 'apply'

const SESSION_SAVE_DEBOUNCE_MS = 400
const SHOW_EXIF_STORAGE_KEY = 'sorter:showExif'

function loadShowExifPreference(): boolean {
  try {
    return localStorage.getItem(SHOW_EXIF_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export default function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('picker')
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState)
  const [filter, setFilter] = useState<FlagFilter>('all')
  const [restoredCount, setRestoredCount] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showExif, setShowExif] = useState(loadShowExifPreference)

  useEffect(() => {
    window.sorter.loadCategories().then(setCategories)
  }, [])

  async function handleFolderSelected(folderPath: string, photos: PhotoEntry[]): Promise<void> {
    const restoredFlags = await window.sorter.loadSession(folderPath)
    const validPaths = new Set(photos.map((p) => p.path))
    const validCategoryIds = new Set(categories.map((c) => c.id))
    const initialFlags: Record<string, Flag> = {}
    if (restoredFlags) {
      for (const [path, flag] of Object.entries(restoredFlags)) {
        if (validPaths.has(path) && flag !== null && validCategoryIds.has(flag)) initialFlags[path] = flag
      }
    }
    setRestoredCount(Object.keys(initialFlags).length)
    dispatch({ type: 'SET_PHOTOS', folderPath, photos, initialFlags })
    setFilter('all')
    setScreen('viewer')
  }

  // Debounced auto-save: flagging happens in quick bursts (P/X/U keypresses), so
  // this coalesces rapid changes into one write instead of hitting disk on every key.
  useEffect(() => {
    if (!state.folderPath) return
    const timer = setTimeout(() => {
      window.sorter.saveSession(state.folderPath, state.flags)
    }, SESSION_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state.folderPath, state.flags])

  function handleAllDone(): void {
    dispatch({ type: 'RESET' })
    setScreen('picker')
  }

  function handleSaveCategories(next: Category[], removedIds: string[]): void {
    setCategories(next)
    window.sorter.saveCategories(next)
    for (const categoryId of removedIds) dispatch({ type: 'CLEAR_CATEGORY', categoryId })
  }

  function handleToggleShowExif(next: boolean): void {
    setShowExif(next)
    try {
      localStorage.setItem(SHOW_EXIF_STORAGE_KEY, String(next))
    } catch {
      // Best-effort only — worst case the preference doesn't survive a restart.
    }
  }

  const usageCounts = countFlags(state.flags, state.photos.length).byCategory

  return (
    <div className="app">
      {screen === 'picker' && (
        <FolderPickerScreen onFolderSelected={handleFolderSelected} onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {screen === 'viewer' && (
        <ViewerScreen
          folderPath={state.folderPath}
          photos={state.photos}
          flags={state.flags}
          categories={categories}
          currentIndex={state.currentIndex}
          restoredCount={restoredCount}
          filter={filter}
          onFilterChange={setFilter}
          onSetFlag={(path, flag) => dispatch({ type: 'SET_FLAG', path, flag })}
          onNext={() => dispatch({ type: 'NEXT' })}
          onPrev={() => dispatch({ type: 'PREV' })}
          onSetIndex={(index) => dispatch({ type: 'SET_INDEX', index })}
          onFinish={() => setScreen('apply')}
          onOpenSettings={() => setSettingsOpen(true)}
          onBackToHome={handleAllDone}
          showExif={showExif}
        />
      )}
      {screen === 'apply' && (
        <ApplyScreen
          folderPath={state.folderPath}
          flags={state.flags}
          categories={categories}
          totalPhotos={state.photos.length}
          onBack={() => setScreen('viewer')}
          onAllDone={handleAllDone}
        />
      )}
      {settingsOpen && (
        <CategorySettings
          categories={categories}
          usageCounts={usageCounts}
          onSave={handleSaveCategories}
          onClose={() => setSettingsOpen(false)}
          showExif={showExif}
          onToggleShowExif={handleToggleShowExif}
        />
      )}
    </div>
  )
}

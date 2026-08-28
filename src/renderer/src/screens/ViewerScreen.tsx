import { useCallback, useEffect, useState } from 'react'
import type { Category, Flag, PhotoEntry } from '@shared/types'
import PhotoView from '../components/PhotoView'
import Filmstrip from '../components/Filmstrip'
import FlagBadge from '../components/FlagBadge'
import GridView from '../components/GridView'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { prefetchPreview } from '../hooks/usePreview'
import { countFlags } from '../state/sessionReducer'
import { useLanguage } from '../i18n/LanguageContext'

export type FlagFilter = 'all' | 'unflagged' | string

type ViewMode = 'loupe' | 'grid'

function matchesFilter(flag: Flag, filter: FlagFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'unflagged') return flag === null
  return flag === filter
}

export default function ViewerScreen({
  folderPath,
  photos,
  flags,
  categories,
  currentIndex,
  restoredCount,
  filter,
  onFilterChange,
  onSetFlag,
  onNext,
  onPrev,
  onSetIndex,
  onFinish,
  onOpenSettings,
  onBackToHome,
  showExif
}: {
  folderPath: string
  photos: PhotoEntry[]
  flags: Record<string, Flag>
  categories: Category[]
  currentIndex: number
  restoredCount: number
  filter: FlagFilter
  onFilterChange: (filter: FlagFilter) => void
  onSetFlag: (path: string, flag: Flag) => void
  onNext: () => void
  onPrev: () => void
  onSetIndex: (index: number) => void
  onFinish: () => void
  onOpenSettings: () => void
  onBackToHome: () => void
  showExif: boolean
}): React.JSX.Element {
  const { t } = useLanguage()
  const [viewMode, setViewMode] = useState<ViewMode>('loupe')
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const currentPhoto = photos[currentIndex]
  const counts = countFlags(flags, photos.length)

  const visiblePhotos = photos.filter((p) => matchesFilter(flags[p.path] ?? null, filter))
  const visibleIndex = currentPhoto ? visiblePhotos.findIndex((p) => p.path === currentPhoto.path) : -1

  const findMatchingIndex = useCallback(
    (fromIndex: number, direction: 1 | -1): number => {
      let i = fromIndex + direction
      while (i >= 0 && i < photos.length) {
        if (matchesFilter(flags[photos[i].path] ?? null, filter)) return i
        i += direction
      }
      return fromIndex
    },
    [photos, flags, filter]
  )

  const advance = useCallback(
    (direction: 1 | -1) => {
      if (filter === 'all') {
        if (direction === 1) onNext()
        else onPrev()
        return
      }
      onSetIndex(findMatchingIndex(currentIndex, direction))
    },
    [filter, onNext, onPrev, onSetIndex, findMatchingIndex, currentIndex]
  )

  const applyFlag = useCallback(
    (flag: Flag) => {
      if (viewMode === 'grid') {
        if (selectedPaths.size === 0) return
        for (const path of selectedPaths) onSetFlag(path, flag)
        setSelectedPaths(new Set())
        return
      }
      if (!currentPhoto) return
      onSetFlag(currentPhoto.path, flag)
      advance(1)
    },
    [viewMode, selectedPaths, currentPhoto, onSetFlag, advance]
  )

  useKeyboardShortcuts(
    {
      onSetCategory: (categoryId) => applyFlag(categoryId),
      onUnflag: () => applyFlag(null),
      onNext: () => advance(1),
      onPrev: () => advance(-1),
      onToggleGrid: () => setViewMode((m) => (m === 'grid' ? 'loupe' : 'grid'))
    },
    categories,
    true
  )

  // Clear the grid selection whenever it stops making sense to keep around —
  // switching back to Loupe, or the filter changing the set of visible photos.
  useEffect(() => {
    if (viewMode === 'loupe') setSelectedPaths(new Set())
  }, [viewMode])
  useEffect(() => {
    setSelectedPaths(new Set())
  }, [filter])

  // If the active filter no longer matches the current photo (filter just changed,
  // or the current photo's flag changed out from under it), jump to the first photo
  // that does match instead of silently showing a photo that shouldn't be visible.
  useEffect(() => {
    if (filter === 'all') return
    if (currentPhoto && matchesFilter(flags[currentPhoto.path] ?? null, filter)) return
    const firstMatch = photos.findIndex((p) => matchesFilter(flags[p.path] ?? null, filter))
    if (firstMatch !== -1) onSetIndex(firstMatch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, currentIndex])

  useEffect(() => {
    for (let offset = 1; offset <= 3; offset++) {
      const next = photos[currentIndex + offset]
      const prev = photos[currentIndex - offset]
      if (next) prefetchPreview(next.path)
      if (prev) prefetchPreview(prev.path)
    }
  }, [currentIndex, photos])

  const filterOptions: { value: FlagFilter; label: string; count: number; color?: string }[] = [
    { value: 'all', label: t('semua'), count: photos.length },
    ...categories.map((c) => ({ value: c.id, label: c.name, count: counts.byCategory[c.id] ?? 0, color: c.color })),
    { value: 'unflagged', label: t('unflagged'), count: counts.unflagged }
  ]

  const showEmptyState = filter !== 'all' && visiblePhotos.length === 0

  const flagButtons = (onClick: (flag: Flag) => void, disabled: boolean): React.JSX.Element => (
    <>
      {categories.map((c) => (
        <button
          key={c.id}
          className="category-flag-button"
          style={{ background: c.color, color: 'white' }}
          onClick={() => onClick(c.id)}
          disabled={disabled}
          type="button"
        >
          {c.name} ({c.shortcut.toUpperCase()})
        </button>
      ))}
      <button className="unflag-button" onClick={() => onClick(null)} disabled={disabled} type="button">
        {t('unflagButton')}
      </button>
    </>
  )

  return (
    <div className="screen viewer-screen">
      <div className="viewer-header">
        <button className="home-button" onClick={onBackToHome} type="button" title={t('backToHomeTooltip')}>
          Home
        </button>
        {viewMode === 'loupe' ? (
          <>
            <span className="position-indicator">
              {filter === 'all'
                ? `${photos.length === 0 ? 0 : currentIndex + 1} / ${photos.length}`
                : `${visibleIndex + 1} / ${visiblePhotos.length}`}
            </span>
            {currentPhoto && <span className="filename">{currentPhoto.name}</span>}
            {currentPhoto && <FlagBadge flag={flags[currentPhoto.path] ?? null} categories={categories} />}
          </>
        ) : (
          <span className="position-indicator">
            {selectedPaths.size > 0
              ? t('selectedCount', { count: selectedPaths.size })
              : t('photoCount', { count: visiblePhotos.length })}
          </span>
        )}
        <div className="filter-tabs">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-tab ${filter === opt.value ? 'active' : ''}`}
              style={filter === opt.value && opt.color ? { background: opt.color } : undefined}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${viewMode === 'loupe' ? 'active' : ''}`}
            onClick={() => setViewMode('loupe')}
            title={t('loupeTooltip')}
          >
            Loupe
          </button>
          <button
            type="button"
            className={`filter-tab ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title={t('gridTooltip')}
          >
            Grid
          </button>
        </div>
        <button className="settings-gear-button" onClick={onOpenSettings} type="button" title={t('settingsTooltip')}>
          ⚙
        </button>
        <button className="secondary-button" onClick={onFinish} type="button">
          {t('selesai')}
        </button>
      </div>
      <div className="folder-path-row">
        <span className="folder-path" title={folderPath}>
          {folderPath}
        </span>
        {restoredCount > 0 && (
          <span className="session-restored-note">{t('restoredSession', { count: restoredCount })}</span>
        )}
      </div>

      {viewMode === 'grid' ? (
        <>
          <GridView
            photos={visiblePhotos}
            flags={flags}
            categories={categories}
            selectedPaths={selectedPaths}
            onSelectionChange={setSelectedPaths}
            onOpenPhoto={(path) => {
              const fullIndex = photos.findIndex((p) => p.path === path)
              if (fullIndex !== -1) onSetIndex(fullIndex)
              setViewMode('loupe')
            }}
          />
          <div className="viewer-controls">
            <button
              className="secondary-button"
              onClick={() => setSelectedPaths(new Set())}
              disabled={selectedPaths.size === 0}
              type="button"
            >
              {t('batalPilih')}
            </button>
            {flagButtons(applyFlag, selectedPaths.size === 0)}
          </div>
        </>
      ) : (
        <>
          {showEmptyState || !currentPhoto ? (
            <div className="photo-view photo-view-empty">
              <span>{t('noPhotosForFlag')}</span>
            </div>
          ) : (
            <PhotoView photo={currentPhoto} showExif={showExif} />
          )}

          <div className="viewer-controls">
            <button onClick={() => advance(-1)} type="button">
              {t('prevButton')}
            </button>
            {flagButtons(applyFlag, false)}
            <button onClick={() => advance(1)} type="button">
              {t('nextButton')}
            </button>
          </div>

          <Filmstrip
            photos={visiblePhotos}
            flags={flags}
            categories={categories}
            currentIndex={visibleIndex}
            onSelect={(idx) => {
              const path = visiblePhotos[idx]?.path
              if (!path) return
              const fullIndex = photos.findIndex((p) => p.path === path)
              if (fullIndex !== -1) onSetIndex(fullIndex)
            }}
          />
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { ApplyProgress, ApplyResult, Category, Flag, UndoResult } from '@shared/types'
import { countFlags } from '../state/sessionReducer'
import { useLanguage } from '../i18n/LanguageContext'

type Phase = 'confirm' | 'running' | 'done'

export default function ApplyScreen({
  folderPath,
  flags,
  categories,
  totalPhotos,
  onBack,
  onAllDone
}: {
  folderPath: string
  flags: Record<string, Flag>
  categories: Category[]
  totalPhotos: number
  onBack: () => void
  onAllDone: () => void
}): React.JSX.Element {
  const { t } = useLanguage()
  const [phase, setPhase] = useState<Phase>('confirm')
  const [progress, setProgress] = useState<ApplyProgress | null>(null)
  const [result, setResult] = useState<ApplyResult | null>(null)
  const [undoResult, setUndoResult] = useState<UndoResult | null>(null)
  const [undoing, setUndoing] = useState(false)

  const counts = countFlags(flags, totalPhotos)

  useEffect(() => {
    const unsubscribe = window.sorter.onApplyProgress(setProgress)
    return unsubscribe
  }, [])

  async function handleConfirm(): Promise<void> {
    setPhase('running')
    const applyResult = await window.sorter.applySort({ folderPath, flags, categories })
    setResult(applyResult)
    setPhase('done')
    // Files have been sorted (or we've given up on the ones that failed) — a stale
    // session file would otherwise try to restore flags for photos that moved.
    void window.sorter.clearSession(folderPath)
  }

  async function handleUndo(): Promise<void> {
    if (!result) return
    setUndoing(true)
    const undo = await window.sorter.undoApply(result.logPath)
    setUndoResult(undo)
    setUndoing(false)
  }

  if (phase === 'confirm') {
    const usedCategories = categories.filter((c) => (counts.byCategory[c.id] ?? 0) > 0)
    return (
      <div className="screen apply-screen">
        <h2>{t('terapkanSortir')}</h2>
        <p className="apply-summary">
          {usedCategories.length === 0
            ? t('belumAdaFlag')
            : usedCategories.map((c) => `${counts.byCategory[c.id]} ${c.name}`).join(' · ')}
          {usedCategories.length > 0 && ` · ${t('unflaggedSummary', { count: counts.unflagged })}`}
        </p>
        <p>
          {t('moveFilesPrefix')}{' '}
          {usedCategories.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <code>{c.name}/</code>
            </span>
          ))}{' '}
          {t('moveFilesSuffix', { path: folderPath })}
        </p>
        <div className="apply-actions">
          <button className="secondary-button" onClick={onBack} type="button">
            {t('kembali')}
          </button>
          <button className="primary-button" onClick={handleConfirm} disabled={usedCategories.length === 0} type="button">
            {t('terapkan')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'running') {
    const pct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0
    return (
      <div className="screen apply-screen">
        <h2>{t('memindahkanFile')}</h2>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p>{progress ? `${progress.done} / ${progress.total} — ${progress.currentFile}` : t('memulai')}</p>
      </div>
    )
  }

  return (
    <div className="screen apply-screen">
      <h2>{t('selesai')}</h2>
      {result && (
        <>
          <p>
            {t('filesMoved', { moved: result.moved })}{' '}
            {result.failed > 0 && t('filesFailedSuffix', { failed: result.failed })}
          </p>
          {result.failed > 0 && (
            <ul className="failure-list">
              {result.failures.map((f) => (
                <li key={f.path}>
                  {f.path}: {f.error}
                </li>
              ))}
            </ul>
          )}
          {!undoResult && (
            <button className="secondary-button" onClick={handleUndo} disabled={undoing} type="button">
              {undoing ? t('membatalkan') : t('undo')}
            </button>
          )}
          {undoResult && (
            <p>
              {t('filesRestored', { restored: undoResult.restored })}
              {undoResult.failed > 0 && ` ${t('filesFailedRestoreSuffix', { failed: undoResult.failed })}`}
            </p>
          )}
        </>
      )}
      <div className="apply-actions">
        <button className="primary-button" onClick={onAllDone} type="button">
          {t('pilihFolderLain')}
        </button>
      </div>
    </div>
  )
}

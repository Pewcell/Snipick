import { useState } from 'react'
import type { PhotoEntry } from '@shared/types'
import Credit from '../components/Credit'
import { useLanguage } from '../i18n/LanguageContext'

export default function FolderPickerScreen({
  onFolderSelected,
  onOpenSettings
}: {
  onFolderSelected: (folderPath: string, photos: PhotoEntry[]) => void
  onOpenSettings: () => void
}): React.JSX.Element {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChooseFolder(): Promise<void> {
    setError(null)
    const folderPath = await window.sorter.selectFolder()
    if (!folderPath) return

    setLoading(true)
    try {
      const photos = await window.sorter.listPhotos(folderPath)
      if (photos.length === 0) {
        setError(t('noSupportedPhotos'))
        return
      }
      onFolderSelected(folderPath, photos)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen folder-picker-screen">
      <button className="settings-gear-button" onClick={onOpenSettings} type="button" title={t('settingsTooltip')}>
        ⚙
      </button>
      <h1>{t('appTitle')}</h1>
      <p>{t('folderPickerSubtitle')}</p>
      <button className="primary-button" onClick={handleChooseFolder} disabled={loading} type="button">
        {loading ? t('loadingButton') : t('chooseFolderButton')}
      </button>
      {error && <p className="error-text">{error}</p>}
      <Credit />
    </div>
  )
}

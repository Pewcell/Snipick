import { useState } from 'react'
import type { Category } from '@shared/types'
import Credit from './Credit'
import { useLanguage } from '../i18n/LanguageContext'
import { LANGUAGES } from '../i18n/translations'
import type { TranslationKey } from '../i18n/translations'

const MAX_CATEGORIES = 6
const RESERVED_SHORTCUTS = new Set(['u', 'g'])
const PRESET_COLORS = ['#16a34a', '#dc2626', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4']

// Mirrors the main process's default in src/main/lib/categories.ts.
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'pick', name: 'Pick', color: '#16a34a', shortcut: 'p' },
  { id: 'reject', name: 'Reject', color: '#dc2626', shortcut: 'x' }
]

function nextId(existing: Category[]): string {
  let n = existing.length + 1
  let id = `cat-${n}`
  const used = new Set(existing.map((c) => c.id))
  while (used.has(id)) {
    n += 1
    id = `cat-${n}`
  }
  return id
}

function nextPresetColor(existing: Category[]): string {
  const used = new Set(existing.map((c) => c.color))
  return PRESET_COLORS.find((c) => !used.has(c)) ?? PRESET_COLORS[existing.length % PRESET_COLORS.length]
}

function nextShortcut(existing: Category[]): string {
  const used = new Set([...existing.map((c) => c.shortcut.toLowerCase()), ...RESERVED_SHORTCUTS])
  for (let code = 97; code <= 122; code++) {
    const letter = String.fromCharCode(code)
    if (!used.has(letter)) return letter
  }
  return ''
}

function validate(
  categories: Category[],
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
): Record<string, string> {
  const errors: Record<string, string> = {}
  const seenShortcuts = new Map<string, string>()

  for (const cat of categories) {
    if (!cat.name.trim()) {
      errors[cat.id] = t('errNameEmpty')
      continue
    }
    const shortcut = cat.shortcut.toLowerCase()
    if (!/^[a-z0-9]$/.test(shortcut)) {
      errors[cat.id] = t('errShortcutFormat')
      continue
    }
    if (RESERVED_SHORTCUTS.has(shortcut)) {
      errors[cat.id] = t('errShortcutReserved', { key: shortcut })
      continue
    }
    if (seenShortcuts.has(shortcut)) {
      errors[cat.id] = t('errShortcutDuplicate', { key: shortcut })
      errors[seenShortcuts.get(shortcut) as string] = t('errShortcutDuplicate', { key: shortcut })
      continue
    }
    seenShortcuts.set(shortcut, cat.id)
  }

  return errors
}

export default function CategorySettings({
  categories,
  usageCounts,
  onSave,
  onClose,
  showExif,
  onToggleShowExif
}: {
  categories: Category[]
  usageCounts: Record<string, number>
  onSave: (categories: Category[], removedIds: string[]) => void
  onClose: () => void
  showExif: boolean
  onToggleShowExif: (next: boolean) => void
}): React.JSX.Element {
  const { t, lang, setLang } = useLanguage()
  const [draft, setDraft] = useState<Category[]>(categories)
  const errors = validate(draft, t)
  const hasErrors = Object.keys(errors).length > 0

  function updateCategory(id: string, patch: Partial<Category>): void {
    setDraft((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addCategory(): void {
    if (draft.length >= MAX_CATEGORIES) return
    const category: Category = {
      id: nextId(draft),
      name: '',
      color: nextPresetColor(draft),
      shortcut: nextShortcut(draft)
    }
    setDraft((prev) => [...prev, category])
  }

  function removeCategory(id: string): void {
    const count = usageCounts[id] ?? 0
    if (count > 0) {
      const ok = window.confirm(t('confirmRemoveCategory', { count }))
      if (!ok) return
    }
    setDraft((prev) => prev.filter((c) => c.id !== id))
  }

  function resetToDefault(): void {
    const droppedUsage = draft
      .filter((c) => !DEFAULT_CATEGORIES.some((d) => d.id === c.id))
      .reduce((sum, c) => sum + (usageCounts[c.id] ?? 0), 0)
    if (droppedUsage > 0) {
      const ok = window.confirm(t('confirmResetDefault', { count: droppedUsage }))
      if (!ok) return
    }
    setDraft(DEFAULT_CATEGORIES.map((c) => ({ ...c })))
  }

  function handleSave(): void {
    if (hasErrors) return
    const removedIds = categories.filter((c) => !draft.some((d) => d.id === c.id)).map((c) => c.id)
    onSave(draft, removedIds)
    onClose()
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{t('pengaturan')}</h2>

        <h3 className="settings-section-title">{t('kategoriSortir')}</h3>
        <p className="modal-hint">{t('categoryHint', { max: MAX_CATEGORIES })}</p>

        <div className="category-list">
          {draft.map((cat) => (
            <div className="category-item" key={cat.id}>
              <div className="category-row">
                <input
                  type="color"
                  className="category-color-input"
                  value={cat.color}
                  onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                />
                <input
                  type="text"
                  className="category-name-input"
                  placeholder={t('namaKategori')}
                  value={cat.name}
                  onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                />
                <input
                  type="text"
                  className="category-shortcut-input"
                  maxLength={1}
                  value={cat.shortcut}
                  onChange={(e) => updateCategory(cat.id, { shortcut: e.target.value.slice(-1) })}
                />
                <button
                  type="button"
                  className="category-remove-button"
                  onClick={() => removeCategory(cat.id)}
                  title={t('hapusKategori')}
                >
                  ✕
                </button>
              </div>
              {errors[cat.id] && <span className="category-error">{errors[cat.id]}</span>}
            </div>
          ))}
        </div>

        <div className="category-list-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={addCategory}
            disabled={draft.length >= MAX_CATEGORIES}
          >
            {t('tambahKategori')}
          </button>
          <button type="button" className="reset-default-link" onClick={resetToDefault}>
            {t('resetDefault')}
          </button>
        </div>

        <h3 className="settings-section-title">{t('tampilan')}</h3>
        <label className="settings-toggle-row">
          <input type="checkbox" checked={showExif} onChange={(e) => onToggleShowExif(e.target.checked)} />
          {t('showExifLabel')}
        </label>

        <h3 className="settings-section-title">{t('bahasa')}</h3>
        <div className="filter-tabs">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              className={`filter-tab ${lang === l.value ? 'active' : ''}`}
              onClick={() => setLang(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="settings-credit-row">
          <Credit />
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            {t('batal')}
          </button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={hasErrors}>
            {t('simpan')}
          </button>
        </div>
      </div>
    </div>
  )
}

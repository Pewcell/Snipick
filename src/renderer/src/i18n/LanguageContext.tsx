import { createContext, useContext, useMemo, useState } from 'react'
import { translations, type Lang, type TranslationKey } from './translations'

const STORAGE_KEY = 'sorter:lang'

function loadInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'en' || stored === 'id' ? stored : 'id'
  } catch {
    return 'id'
  }
}

type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslateFn
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [lang, setLangState] = useState<Lang>(loadInitialLang)

  function setLang(next: Lang): void {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Best-effort only — worst case the preference doesn't survive a restart.
    }
  }

  const t = useMemo<TranslateFn>(() => {
    return (key, vars) => {
      let str: string = translations[lang][key]
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          str = str.replace(`{${name}}`, String(value))
        }
      }
      return str
    }
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}

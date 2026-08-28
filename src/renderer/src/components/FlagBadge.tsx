import type { Category, Flag } from '@shared/types'
import { useLanguage } from '../i18n/LanguageContext'

export default function FlagBadge({ flag, categories }: { flag: Flag; categories: Category[] }): React.JSX.Element {
  const { t } = useLanguage()
  const category = flag ? categories.find((c) => c.id === flag) : undefined

  if (!category) {
    return <span className="flag-badge neutral">{t('unflagged')}</span>
  }

  return (
    <span className="flag-badge" style={{ background: category.color, color: 'white' }}>
      {category.name}
    </span>
  )
}

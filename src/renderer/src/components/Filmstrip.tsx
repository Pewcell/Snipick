import type { Category, Flag, PhotoEntry } from '@shared/types'
import { usePreview } from '../hooks/usePreview'
import { orientationTransformCss } from '../lib/orientationCss'

const ACTIVE_BORDER_COLOR = '#3b82f6'
const NEUTRAL_BORDER_COLOR = 'transparent'

function Thumb({
  photo,
  flag,
  categories,
  active,
  onClick
}: {
  photo: PhotoEntry
  flag: Flag
  categories: Category[]
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  const preview = usePreview(photo.path)
  const url = preview !== 'loading' && preview.source !== 'fallback-icon' ? preview.url : undefined
  const orientation = preview !== 'loading' && preview.source === 'embedded' ? preview.orientation : undefined
  const category = flag ? categories.find((c) => c.id === flag) : undefined
  const borderColor = active ? ACTIVE_BORDER_COLOR : (category?.color ?? NEUTRAL_BORDER_COLOR)

  return (
    <button
      className="filmstrip-thumb"
      style={{ borderColor }}
      onClick={onClick}
      title={photo.name}
      type="button"
    >
      {url ? (
        <img src={url} alt={photo.name} draggable={false} style={{ transform: orientationTransformCss(orientation) }} />
      ) : (
        <div className="thumb-placeholder" />
      )}
    </button>
  )
}

const WINDOW_RADIUS = 15

export default function Filmstrip({
  photos,
  flags,
  categories,
  currentIndex,
  onSelect
}: {
  photos: PhotoEntry[]
  flags: Record<string, Flag>
  categories: Category[]
  currentIndex: number
  onSelect: (index: number) => void
}): React.JSX.Element {
  const start = Math.max(0, currentIndex - WINDOW_RADIUS)
  const end = Math.min(photos.length, currentIndex + WINDOW_RADIUS + 1)
  const windowed = photos.slice(start, end)

  return (
    <div className="filmstrip">
      {windowed.map((photo, offset) => {
        const index = start + offset
        return (
          <Thumb
            key={photo.path}
            photo={photo}
            flag={flags[photo.path] ?? null}
            categories={categories}
            active={index === currentIndex}
            onClick={() => onSelect(index)}
          />
        )
      })}
    </div>
  )
}

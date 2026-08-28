import { useEffect, useState } from 'react'
import type { PhotoEntry } from '@shared/types'
import { usePreview } from '../hooks/usePreview'
import { useElementSize } from '../hooks/useElementSize'
import { useZoomPan, MAX_ZOOM, MIN_ZOOM } from '../hooks/useZoomPan'
import { orientationTransformCss } from '../lib/orientationCss'
import ExifOverlay from './ExifOverlay'
import { useLanguage } from '../i18n/LanguageContext'

export default function PhotoView({
  photo,
  showExif
}: {
  photo: PhotoEntry
  showExif: boolean
}): React.JSX.Element {
  const { t } = useLanguage()
  const preview = usePreview(photo.path)
  const [containerRef, containerSize] = useElementSize()
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)

  const orientation = preview !== 'loading' && preview.source === 'embedded' ? preview.orientation : undefined
  const dimensionSwapped = orientation?.dimensionSwapped ?? false

  // fitBox holds the <img> element's own (pre-rotation) box — needed to size the DOM
  // element so the CSS rotate transform below produces the correct final shape.
  let fitBox: { width: number; height: number; containerWidth: number; containerHeight: number } | null = null
  if (naturalSize && containerSize.width > 0 && containerSize.height > 0) {
    const effectiveNaturalW = dimensionSwapped ? naturalSize.height : naturalSize.width
    const effectiveNaturalH = dimensionSwapped ? naturalSize.width : naturalSize.height
    const baseScale = Math.min(containerSize.width / effectiveNaturalW, containerSize.height / effectiveNaturalH)
    fitBox = {
      width: naturalSize.width * baseScale,
      height: naturalSize.height * baseScale,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height
    }
  }

  // visualBox is what's actually seen on screen after rotation — pan clamping must be
  // based on this, not the pre-rotation fitBox, or a 90/270deg rotation swaps the axes.
  const visualBox =
    fitBox && dimensionSwapped
      ? { ...fitBox, width: fitBox.height, height: fitBox.width }
      : fitBox

  const { zoom, pan, isDragging, reset, zoomIn, zoomOut, onWheel, onMouseDown } = useZoomPan(visualBox)

  useEffect(() => {
    setNaturalSize(null)
    reset()
    // reset() is stable across renders (useCallback with no deps); only photo.path should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.path])

  if (preview === 'loading') {
    return (
      <div className="photo-view photo-view-empty" ref={containerRef}>
        <span>{t('memuat')}</span>
      </div>
    )
  }

  if (preview.source === 'fallback-icon' || !preview.url) {
    return (
      <div className="photo-view photo-view-empty" ref={containerRef}>
        <div className="fallback-icon">🖼</div>
        <span>{t('previewNotAvailable', { name: photo.name })}</span>
      </div>
    )
  }

  const imgStyle: React.CSSProperties = fitBox
    ? {
        width: fitBox.width * zoom,
        height: fitBox.height * zoom,
        transform: orientationTransformCss(orientation),
        transformOrigin: 'center'
      }
    : { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', visibility: 'hidden' }

  return (
    <div
      className="photo-view"
      ref={containerRef}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      style={{ cursor: zoom > MIN_ZOOM ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      <div
        className="photo-zoom-layer"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        <img
          src={preview.url}
          alt={photo.name}
          draggable={false}
          style={imgStyle}
          onLoad={(e) => {
            const img = e.currentTarget
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
          }}
        />
      </div>

      {preview.lowRes && <span className="low-res-badge">{t('lowResBadge')}</span>}

      {showExif && <ExifOverlay photoPath={photo.path} />}

      <div className="zoom-controls" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} title={t('zoomOut')}>
          −
        </button>
        <button type="button" className="zoom-percent" onClick={reset} title={t('resetZoom')}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} title={t('zoomIn')}>
          +
        </button>
      </div>
    </div>
  )
}

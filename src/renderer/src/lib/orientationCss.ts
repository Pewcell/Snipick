import type { OrientationTransform } from '@shared/types'

export function orientationTransformCss(orientation: OrientationTransform | undefined): string {
  if (!orientation) return 'none'
  return `rotate(${orientation.deg}deg) scale(${orientation.scaleX}, ${orientation.scaleY})`
}

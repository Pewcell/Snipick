import { useExif } from '../hooks/useExif'

export default function ExifOverlay({ photoPath }: { photoPath: string }): React.JSX.Element | null {
  const exif = useExif(photoPath)

  if (exif === 'loading' || !exif) return null

  const parts: string[] = []
  if (exif.iso !== undefined) parts.push(`ISO ${exif.iso}`)
  if (exif.aperture !== undefined) parts.push(`f/${exif.aperture}`)
  if (exif.shutterSpeed) parts.push(exif.shutterSpeed)
  if (exif.focalLength !== undefined) parts.push(`${exif.focalLength}mm`)

  if (parts.length === 0) return null

  return (
    <div className="exif-overlay">
      <div>{parts.join(' · ')}</div>
      {exif.camera && <div className="exif-camera">{exif.camera}</div>}
    </div>
  )
}

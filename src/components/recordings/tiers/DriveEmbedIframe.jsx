import { useEffect, useRef } from 'react'
import { extractFileId } from '../../../lib/driveStream'

export default function DriveEmbedIframe({ recording, onError, onLoad }) {
  const timerRef = useRef(null)
  const fileId = recording?.google_drive_file_id || extractFileId(recording?.google_drive_url)
  const url = fileId ? `https://drive.google.com/embed/${fileId}` : null

  useEffect(() => {
    if (!url) { onError?.('no_file_id'); return }
    timerRef.current = setTimeout(() => onError?.('embed_timeout'), 15000)
    return () => clearTimeout(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!url) return null

  return (
    <div className="w-full relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={url}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
        allowFullScreen
        onLoad={() => { clearTimeout(timerRef.current); onLoad?.() }}
        onError={() => onError?.('embed_iframe_error')}
      />
    </div>
  )
}

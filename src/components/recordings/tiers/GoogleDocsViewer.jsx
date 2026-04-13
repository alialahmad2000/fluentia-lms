import { useEffect, useRef } from 'react'
import { extractFileId } from '../../../lib/driveStream'

export default function GoogleDocsViewer({ recording, onError, onLoad }) {
  const timerRef = useRef(null)
  const fileId = recording?.google_drive_file_id || extractFileId(recording?.google_drive_url)
  const driveUrl = fileId
    ? encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`)
    : null
  const viewerUrl = driveUrl
    ? `https://docs.google.com/viewer?url=${driveUrl}&embedded=true`
    : null

  useEffect(() => {
    if (!viewerUrl) { onError?.('no_file_id'); return }
    timerRef.current = setTimeout(() => onError?.('docs_viewer_timeout'), 15000)
    return () => clearTimeout(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!viewerUrl) return null

  return (
    <div className="w-full relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={viewerUrl}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
        allowFullScreen
        onLoad={() => { clearTimeout(timerRef.current); onLoad?.() }}
        onError={() => onError?.('docs_viewer_error')}
      />
    </div>
  )
}

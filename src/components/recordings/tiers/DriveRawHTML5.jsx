import { useEffect, useRef } from 'react'
import { extractFileId } from '../../../lib/driveStream'

export default function DriveRawHTML5({ recording, onError, onLoad }) {
  const timerRef = useRef(null)
  const playStartedRef = useRef(false)
  const fileId = recording?.google_drive_file_id || extractFileId(recording?.google_drive_url)
  const url = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null

  useEffect(() => {
    if (!url) { onError?.('no_file_id'); return }
    timerRef.current = setTimeout(() => {
      if (!playStartedRef.current) onError?.('raw_html5_timeout')
    }, 12000)
    return () => clearTimeout(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!url) return null

  return (
    <div className="w-full relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full bg-black"
        onPlaying={() => {
          playStartedRef.current = true
          clearTimeout(timerRef.current)
          onLoad?.()
        }}
        onError={() => onError?.('raw_html5_failed')}
      />
    </div>
  )
}

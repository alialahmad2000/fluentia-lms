import { useEffect, useRef } from 'react'
import { extractFileId } from '../../lib/driveStream'

export default function DriveFallbackPlayer({ recording, onError, onLoad }) {
  const loadTimerRef = useRef(null)

  const fileId = extractFileId(recording?.google_drive_url)
  const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null

  useEffect(() => {
    // Drive iframe doesn't fire reliable load events for video readiness
    // Use a generous timeout — if onLoad doesn't fire in 15s, escalate
    loadTimerRef.current = setTimeout(() => {
      console.warn('[DriveFallback] Iframe load timeout')
      onError?.()
    }, 15000)

    return () => clearTimeout(loadTimerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleIframeLoad = () => {
    clearTimeout(loadTimerRef.current)
    onLoad?.()
  }

  if (!previewUrl) {
    onError?.()
    return null
  }

  return (
    <div className="w-full relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={previewUrl}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
        allowFullScreen
        onLoad={handleIframeLoad}
        onError={() => onError?.()}
      />
    </div>
  )
}

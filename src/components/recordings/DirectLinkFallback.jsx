import { ExternalLink, MessageCircle } from 'lucide-react'
import { extractFileId } from '../../lib/driveStream'

export default function DirectLinkFallback({ recording }) {
  const fileId = extractFileId(recording?.google_drive_url)
  const driveUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/view`
    : recording?.google_drive_url || '#'

  const title = recording?.title || 'التسجيل'

  return (
    <div className="w-full flex items-center justify-center bg-slate-900 rounded-2xl p-8" style={{ aspectRatio: '16/9' }} dir="rtl">
      <div className="text-center max-w-md">
        <h3 className="text-2xl font-bold text-white font-['Tajawal'] mb-3">
          مشكلة في تشغيل التسجيل
        </h3>
        <p className="text-white/70 font-['Tajawal'] mb-6">
          يمكنك فتح التسجيل مباشرة في Google Drive، أو التواصل مع الدعم.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 rounded-xl text-white font-bold font-['Tajawal'] flex items-center justify-center gap-2 transition"
          >
            <ExternalLink className="w-5 h-5" />
            افتح في Google Drive
          </a>
          <a
            href={`https://wa.me/966558669974?text=${encodeURIComponent(`مشكلة في تشغيل تسجيل: ${title}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-['Tajawal'] flex items-center justify-center gap-2 transition"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل مع الدعم
          </a>
        </div>
      </div>
    </div>
  )
}

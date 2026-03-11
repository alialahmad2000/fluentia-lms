import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Download } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

function getStorageUrl(path) {
  const { data } = supabase.storage.from('materials').getPublicUrl(path)
  return data?.publicUrl || null
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['mp4', 'mov', 'webm'].includes(ext)) return '🎬'
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵'
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️'
  return '📎'
}

export default function StudentLibrary() {
  const { studentData } = useAuthStore()
  const groupId = studentData?.group_id

  const { data: materials, isLoading } = useQuery({
    queryKey: ['student-materials', groupId],
    queryFn: async () => {
      if (!groupId) return []
      const { data: files } = await supabase.storage.from('materials').list(groupId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (!files) return []
      return files
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => ({ ...f, fullPath: `${groupId}/${f.name}` }))
    },
    enabled: !!groupId,
  })

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">المكتبة</h1>
        <p className="text-muted text-sm mt-1">المواد التعليمية لمجموعتك</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>
      ) : materials?.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <BookOpen size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted">لا توجد مواد تعليمية حالياً</p>
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((file, i) => {
            const url = getStorageUrl(file.fullPath)
            const sizeKB = file.metadata?.size ? Math.round(file.metadata.size / 1024) : null
            return (
              <motion.div
                key={file.fullPath}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card p-4 flex items-center gap-3 hover:border-sky-500/20 transition-all block"
                >
                  <span className="text-2xl">{getFileIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{file.name.replace(/^\d+_/, '')}</p>
                    {sizeKB && (
                      <p className="text-xs text-muted mt-0.5">
                        {sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`}
                      </p>
                    )}
                  </div>
                  <Download size={16} className="text-sky-400 shrink-0" />
                </a>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

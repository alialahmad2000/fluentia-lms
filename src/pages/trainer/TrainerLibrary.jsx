import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Upload, Trash2, Download, FileText, Video, Link2, Loader2, Plus, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

function getStorageUrl(path) {
  const { data } = supabase.storage.from('materials').getPublicUrl(path)
  return data?.publicUrl || null
}

function getFileIcon(name) {
  const parts = name.split('.')
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : ''
  if (['pdf'].includes(ext)) return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['mp4', 'mov', 'webm'].includes(ext)) return '🎬'
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵'
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️'
  return '📎'
}

export default function TrainerLibrary() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const role = profile?.role
  const isAdmin = role === 'admin'
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // Groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // List materials from storage
  const { data: materials, isLoading, refetch } = useQuery({
    queryKey: ['trainer-materials', selectedGroup],
    queryFn: async () => {
      const targetGroups = selectedGroup === 'all' ? (groups || []) : (groups || []).filter(g => g.id === selectedGroup)
      const allFiles = []

      for (const group of targetGroups) {
        const { data: files } = await supabase.storage.from('materials').list(group.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
        if (files) {
          for (const f of files) {
            if (f.name === '.emptyFolderPlaceholder') continue
            allFiles.push({
              ...f,
              groupId: group.id,
              groupCode: group.code,
              groupName: group.name,
              fullPath: `${group.id}/${f.name}`,
            })
          }
        }
      }

      return allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    },
    enabled: !!groups?.length,
  })

  // Upload file
  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const groupId = selectedGroup === 'all' ? groups?.[0]?.id : selectedGroup
    if (!groupId) return

    setUploading(true)
    try {
      const timestamp = Date.now()
      const ext = file.name.split('.').pop()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-\u0600-\u06FF]/g, '_')
      const path = `${groupId}/${timestamp}_${safeName}`
      const { error } = await supabase.storage.from('materials').upload(path, file, { upsert: false })
      if (error) throw error
      refetch()
    } catch (err) {
      console.error('Upload error:', err)
      alert('فشل رفع الملف: ' + (err.message || 'حاول مرة أخرى'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Delete file
  const deleteMutation = useMutation({
    mutationFn: async (path) => {
      const { error } = await supabase.storage.from('materials').remove([path])
      if (error) throw error
    },
    onSuccess: () => refetch(),
    onError: (err) => {
      console.error('[Library] Delete error:', err)
      alert('فشل حذف الملف: ' + (err.message || 'حاول مرة أخرى'))
    },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <BookOpen size={20} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">المكتبة</h1>
            <p className="text-muted text-sm mt-1">المواد التعليمية والملفات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            رفع ملف
          </button>
        </div>
      </div>

      {/* Group filter */}
      {groups?.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm">المجموعة:</span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="input-field py-2 px-3 text-sm"
          >
            <option value="all">الكل</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.code})</option>)}
          </select>
        </div>
      )}

      {/* Materials list */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>
      ) : materials?.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <BookOpen size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted">لا توجد ملفات — ارفع أول ملف</p>
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
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4 flex items-center gap-3 hover:translate-y-[-2px] transition-all duration-200"
              >
                <span className="text-2xl">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name.replace(/^\d+_/, '')}</p>
                  <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                    <span className="badge-blue text-[10px]">{file.groupCode}</span>
                    {sizeKB && <span>{sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-muted hover:text-sky-400 transition-colors rounded-lg hover:bg-sky-500/10"
                    title="تحميل"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => {
                      if (confirm('حذف هذا الملف؟')) deleteMutation.mutate(file.fullPath)
                    }}
                    className="p-2 text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

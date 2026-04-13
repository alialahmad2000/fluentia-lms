import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

const CATEGORIES = ['caption', 'image', 'video', 'template', 'guide']
const PLATFORMS = ['twitter', 'instagram', 'tiktok', 'snapchat', 'whatsapp', 'general']

export default function AffiliateMaterialsAdmin() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data: materials = [], isPending } = useQuery({
    queryKey: ['admin-affiliate-materials'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from('affiliate_materials').select('*').order('sort_order')
      return data || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('affiliate_materials').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-affiliate-materials'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase.from('affiliate_materials').update({ is_active: !is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-affiliate-materials'] }),
  })

  const openEdit = (m) => { setEditing(m); setShowForm(true) }
  const openNew = () => { setEditing(null); setShowForm(true) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">المواد التسويقية</h1>
        <button onClick={openNew} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm font-['Tajawal'] transition">
          <Plus size={14} /> إضافة مادة
        </button>
      </div>

      {isPending ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl skeleton" />)}</div>
      ) : materials.length === 0 ? (
        <p className="text-center py-8 text-[var(--text-muted)] font-['Tajawal']">لا توجد مواد</p>
      ) : (
        <div className="space-y-2">
          {materials.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)] font-['Tajawal'] text-sm truncate">{m.title}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-muted)]">{m.category}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-muted)]">{m.platform}</span>
                  <span className="text-xs text-[var(--text-muted)]">#{m.sort_order}</span>
                </div>
                {m.content && <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{m.content.substring(0, 80)}...</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleMutation.mutate({ id: m.id, is_active: m.is_active })} className="p-1.5 rounded hover:bg-white/5" title={m.is_active ? 'تعطيل' : 'تفعيل'}>
                  {m.is_active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} className="text-[var(--text-muted)]" />}
                </button>
                <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-white/5 text-[var(--text-muted)]"><Edit3 size={14} /></button>
                <button onClick={() => { if (confirm('حذف هذه المادة؟')) deleteMutation.mutate(m.id) }} className="p-1.5 rounded hover:bg-red-500/10 text-red-400/50 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <MaterialForm material={editing} onClose={() => { setShowForm(false); setEditing(null) }} />}
    </div>
  )
}

function MaterialForm({ material, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!material
  const [title, setTitle] = useState(material?.title || '')
  const [description, setDescription] = useState(material?.description || '')
  const [category, setCategory] = useState(material?.category || 'caption')
  const [platform, setPlatform] = useState(material?.platform || 'general')
  const [content, setContent] = useState(material?.content || '')
  const [assetUrl, setAssetUrl] = useState(material?.asset_url || '')
  const [sortOrder, setSortOrder] = useState(material?.sort_order || 0)
  const [isActive, setIsActive] = useState(material?.is_active ?? true)
  const [uploading, setUploading] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { title, description: description || null, category, platform, content: content || null, asset_url: assetUrl || null, sort_order: sortOrder, is_active: isActive }
      if (isEdit) {
        const { error } = await supabase.from('affiliate_materials').update(payload).eq('id', material.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('affiliate_materials').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-affiliate-materials'] })
      onClose()
    },
  })

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `materials/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('affiliate-materials').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('affiliate-materials').getPublicUrl(path)
      setAssetUrl(publicUrl)
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4">{isEdit ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h2>
        <div className="space-y-3">
          <div><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">العنوان *</label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-['Tajawal']" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">التصنيف</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-['Tajawal']">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">المنصة</label><select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-['Tajawal']">{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">المحتوى (استخدم {'{ref_link}'} للرابط)</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-['Tajawal'] resize-none" /></div>
          <div><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">الوصف</label><input value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-['Tajawal']" /></div>
          <div>
            <label className="text-xs text-[var(--text-muted)] font-['Tajawal']">رفع ملف (صورة/فيديو)</label>
            <input type="file" accept="image/*,video/*" onChange={handleUpload} className="w-full mt-1 text-sm text-[var(--text-muted)]" />
            {uploading && <p className="text-xs text-sky-400 mt-1"><Loader2 size={12} className="inline animate-spin" /> جاري الرفع...</p>}
            {assetUrl && <p className="text-xs text-emerald-400 mt-1 truncate">✓ {assetUrl}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">الترتيب</label><input type="number" value={sortOrder} onChange={e => setSortOrder(+e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]" /></div>
            <div className="flex items-center gap-2 mt-5"><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">مفعّل</label><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-amber-500" /></div>
          </div>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !title} className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold font-['Tajawal'] disabled:opacity-50">
            {saveMutation.isPending ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة'}
          </button>
        </div>
      </div>
    </div>
  )
}

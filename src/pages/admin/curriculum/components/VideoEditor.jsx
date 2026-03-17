import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import ImagePreview from './ImagePreview'
import JSONArrayEditor from './JSONArrayEditor'

export default function VideoEditor({ unitId, video, onRefresh }) {
  const [data, setData] = useState(video || {})
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        unit_id: unitId,
        video_title_en: data.video_title_en || '', video_title_ar: data.video_title_ar || '',
        video_url: data.video_url || '', video_thumbnail_url: data.video_thumbnail_url || null,
        before_watch: data.before_watch || [], while_watch: data.while_watch || [],
        after_watch: data.after_watch || [], vocabulary_review: data.vocabulary_review || [],
      }

      if (data.id) {
        const { error } = await supabase.from('curriculum_video_sections').update(payload).eq('id', data.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase.from('curriculum_video_sections').insert(payload).select('id').single()
        if (error) throw error
        setData(prev => ({ ...prev, id: inserted.id }))
      }
      onRefresh?.()
    } catch (err) {
      console.error('Save video error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input value={data.video_title_en || ''} onChange={e => update('video_title_en', e.target.value)} placeholder="Title (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.video_title_ar || ''} onChange={e => update('video_title_ar', e.target.value)} placeholder="العنوان" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>رابط الفيديو</label>
        <input value={data.video_url || ''} onChange={e => update('video_url', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        {data.video_url && (
          <div className="mt-2 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', maxWidth: 480 }}>
            <iframe
              src={data.video_url.replace('watch?v=', 'embed/')}
              className="w-full aspect-video"
              allowFullScreen
              title="Video preview"
            />
          </div>
        )}
      </div>

      <ImagePreview label="صورة مصغرة" value={data.video_thumbnail_url} onChange={v => update('video_thumbnail_url', v)} />

      <JSONArrayEditor label="قبل المشاهدة" value={data.before_watch || []} onChange={v => update('before_watch', v)} />
      <JSONArrayEditor label="أثناء المشاهدة" value={data.while_watch || []} onChange={v => update('while_watch', v)} />
      <JSONArrayEditor label="بعد المشاهدة (نقاش)" value={data.after_watch || []} onChange={v => update('after_watch', v)} />
      <JSONArrayEditor label="مراجعة المفردات" value={data.vocabulary_review || []} onChange={v => update('vocabulary_review', v)} />

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ الفيديو'}
      </button>
    </div>
  )
}

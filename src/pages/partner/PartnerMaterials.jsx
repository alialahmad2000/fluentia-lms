import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Copy, Check, ExternalLink, Download, MessageSquare, Image, Video, FileText, BookOpen } from 'lucide-react'

const CATEGORIES = [
  { key: 'caption', label: 'كابشنز', icon: MessageSquare },
  { key: 'image', label: 'صور', icon: Image },
  { key: 'video', label: 'فيديوهات', icon: Video },
  { key: 'template', label: 'قوالب واتساب', icon: FileText },
  { key: 'guide', label: 'دليل', icon: BookOpen },
]

const PLATFORM_ICON = {
  twitter: '𝕏',
  instagram: '📸',
  tiktok: '🎵',
  snapchat: '👻',
  whatsapp: '💬',
  general: '🌐',
}

const PLATFORM_SHARE = {
  twitter: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  whatsapp: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  tiktok: () => null,
  snapchat: () => null,
  instagram: () => null,
  general: (text) => `https://t.me/share/url?text=${encodeURIComponent(text)}`,
}

export default function PartnerMaterials() {
  const { affiliate } = useOutletContext()
  const refLink = `https://fluentia.academy/?ref=${affiliate.ref_code}`
  const [tab, setTab] = useState('caption')
  const [copiedId, setCopiedId] = useState(null)

  const { data: materials = [], isPending } = useQuery({
    queryKey: ['partner-materials'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_materials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })

  const filtered = materials.filter(m => {
    if (tab === 'template') return m.category === 'caption' && m.platform === 'whatsapp'
    if (tab === 'caption') return m.category === 'caption' && m.platform !== 'whatsapp'
    return m.category === tab
  })

  const renderContent = (content) => content?.replace(/\{ref_link\}/g, refLink) || ''

  const copyText = (id, content) => {
    navigator.clipboard.writeText(renderContent(content))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-white font-['Tajawal']">رابطي والمواد التسويقية</h1>

      {/* Ref link quick copy */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <code className="text-xs text-amber-400 flex-1 truncate" dir="ltr">{refLink}</code>
        <button onClick={() => copyText('link', refLink)} className="shrink-0 text-xs px-2 py-1 rounded bg-amber-500 text-black font-bold font-['Tajawal']">
          {copiedId === 'link' ? 'تم!' : 'نسخ'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Tajawal'] whitespace-nowrap transition ${
              tab === c.key
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
            }`}
          >
            <c.icon size={13} />
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isPending ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/40 font-['Tajawal']">سيتم إضافة المواد قريباً</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(m => {
            if (m.category === 'caption') return <CaptionCard key={m.id} material={m} rendered={renderContent(m.content)} copied={copiedId === m.id} onCopy={() => copyText(m.id, m.content)} />
            if (m.category === 'image' || m.category === 'video') return <AssetCard key={m.id} material={m} />
            return <CaptionCard key={m.id} material={m} rendered={renderContent(m.content)} copied={copiedId === m.id} onCopy={() => copyText(m.id, m.content)} />
          })}
        </div>
      )}
    </div>
  )
}

function CaptionCard({ material, rendered, copied, onCopy }) {
  const shareUrl = PLATFORM_SHARE[material.platform]?.(rendered)
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{PLATFORM_ICON[material.platform] || '🌐'}</span>
        <span className="font-bold text-white font-['Tajawal'] text-sm">{material.title}</span>
        <span className="text-xs text-white/30 font-['Tajawal'] mr-auto">{rendered.length} حرف</span>
      </div>
      <div className="rounded-lg p-3 bg-black/20 border border-white/5 text-sm text-white/70 whitespace-pre-wrap font-['Tajawal'] leading-relaxed" dir="rtl">
        {rendered}
      </div>
      <div className="flex gap-2">
        <button onClick={onCopy} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold font-['Tajawal'] transition">
          {copied ? <><Check size={12} /> تم النسخ</> : <><Copy size={12} /> نسخ النص</>}
        </button>
        {shareUrl && (
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-['Tajawal'] transition border border-white/10">
            <ExternalLink size={12} /> شارك مباشرة
          </a>
        )}
      </div>
    </div>
  )
}

function AssetCard({ material }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {material.thumbnail_url && (
        <img src={material.thumbnail_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{PLATFORM_ICON[material.platform] || '🌐'}</span>
          <span className="font-bold text-white font-['Tajawal'] text-sm truncate">{material.title}</span>
        </div>
        {material.description && <p className="text-xs text-white/50 font-['Tajawal'] mt-1">{material.description}</p>}
      </div>
      {material.asset_url && (
        <a href={material.asset_url} download className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 text-xs font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/25 transition shrink-0">
          <Download size={12} /> تحميل
        </a>
      )}
    </div>
  )
}

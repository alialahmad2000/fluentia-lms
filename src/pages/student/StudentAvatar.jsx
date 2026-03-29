import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  User, Palette, Save, Loader2, CheckCircle2, Sparkles,
  Crown, Star, Shield, Flame, Zap, Heart, Target,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const AVATAR_STYLES = [
  { id: 'default', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' },
  { id: 'emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'violet', bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  { id: 'gold', bg: 'bg-gold-500/20', text: 'text-gold-400', border: 'border-gold-500/30' },
  { id: 'rose', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  { id: 'amber', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  { id: 'red', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  { id: 'teal', bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
]

const BADGE_ICONS = [
  { id: 'crown', Icon: Crown, label: 'تاج', minXp: 500 },
  { id: 'star', Icon: Star, label: 'نجمة', minXp: 0 },
  { id: 'shield', Icon: Shield, label: 'درع', minXp: 200 },
  { id: 'flame', Icon: Flame, label: 'شعلة', minXp: 100 },
  { id: 'zap', Icon: Zap, label: 'برق', minXp: 0 },
  { id: 'heart', Icon: Heart, label: 'قلب', minXp: 0 },
  { id: 'target', Icon: Target, label: 'هدف', minXp: 300 },
  { id: 'sparkles', Icon: Sparkles, label: 'لمعة', minXp: 400 },
]

const FRAMES = [
  { id: 'none', label: 'بدون', ring: '' },
  { id: 'basic', label: 'أساسي', ring: 'ring-2 ring-white/20', minXp: 0 },
  { id: 'silver', label: 'فضي', ring: 'ring-2 ring-white/40', minXp: 100 },
  { id: 'gold', label: 'ذهبي', ring: 'ring-2 ring-gold-400/60', minXp: 300 },
  { id: 'diamond', label: 'ألماسي', ring: 'ring-2 ring-sky-400/60 shadow-lg shadow-sky-400/20', minXp: 500 },
  { id: 'fire', label: 'ناري', ring: 'ring-2 ring-red-400/60 shadow-lg shadow-red-400/20', minXp: 800 },
]

export default function StudentAvatar() {
  const { profile, studentData, fetchProfile } = useAuthStore()
  const xp = studentData?.xp_total || 0

  // Load saved customization
  const savedCustom = profile?.avatar_customization || {}
  const [selectedStyle, setSelectedStyle] = useState(savedCustom.style || 'default')
  const [selectedBadge, setSelectedBadge] = useState(savedCustom.badge || 'star')
  const [selectedFrame, setSelectedFrame] = useState(savedCustom.frame || 'none')
  const [displayEmoji, setDisplayEmoji] = useState(savedCustom.emoji || '')
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('profiles')
        .update({
          avatar_customization: {
            style: selectedStyle,
            badge: selectedBadge,
            frame: selectedFrame,
            emoji: displayEmoji,
          },
        })
        .eq('id', profile?.id)
    },
    onSuccess: async () => {
      setSaved(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) fetchProfile(user)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (err) => {
      console.error('[StudentAvatar] save error:', err)
    },
  })

  const style = AVATAR_STYLES.find(s => s.id === selectedStyle) || AVATAR_STYLES[0]
  const frame = FRAMES.find(f => f.id === selectedFrame) || FRAMES[0]
  const badge = BADGE_ICONS.find(b => b.id === selectedBadge)
  const initial = displayEmoji || (profile?.display_name || profile?.full_name || '?')[0]

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Palette size={20} className="text-violet-400" />
          </div>
          تخصيص الأفاتار
        </h1>
        <p className="text-muted text-sm mt-1">صمم شخصيتك المميزة في المنصة</p>
      </div>

      {/* Preview */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-8 text-center">
        <div className="relative inline-block">
          <div className={`w-24 h-24 rounded-2xl ${style.bg} border ${style.border} ${frame.ring} flex items-center justify-center text-3xl font-bold ${style.text} mx-auto`}>
            {initial}
          </div>
          {badge && (
            <div className={`absolute -bottom-1 -left-1 w-8 h-8 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}>
              <badge.Icon size={14} className={style.text} />
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-4">{profile?.display_name || profile?.full_name}</h2>
        <p className="text-sm text-muted">{xp} XP</p>
      </motion.div>

      {/* Color Style */}
      <div className="fl-card-static p-7">
        <h3 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>لون الأفاتار</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {AVATAR_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`w-12 h-12 rounded-xl ${s.bg} border ${
                selectedStyle === s.id ? s.border + ' ring-2 ring-offset-2 ring-offset-darkest ' + s.border : 'border-transparent'
              } flex items-center justify-center transition-all`}
            >
              <User size={20} className={s.text} />
            </button>
          ))}
        </div>
      </div>

      {/* Badge Icon */}
      <div className="fl-card-static p-7">
        <h3 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>شارة المميزة</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {BADGE_ICONS.map(b => {
            const locked = xp < b.minXp
            return (
              <button
                key={b.id}
                onClick={() => !locked && setSelectedBadge(b.id)}
                disabled={locked}
                className={`p-3 rounded-xl text-center transition-all ${
                  locked
                    ? 'bg-[var(--surface-raised)] opacity-30 cursor-not-allowed'
                    : selectedBadge === b.id
                      ? 'bg-violet-500/20 border border-violet-500/30'
                      : 'bg-[var(--surface-raised)] hover:bg-[var(--sidebar-hover-bg)]'
                }`}
              >
                <b.Icon size={20} className={locked ? 'text-muted mx-auto' : 'text-violet-400 mx-auto'} />
                <p className="text-xs text-muted mt-1">{b.label}</p>
                {locked && <p className="text-[11px] text-red-400">{b.minXp} XP</p>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Frame */}
      <div className="fl-card-static p-7">
        <h3 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>إطار الأفاتار</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {FRAMES.map(f => {
            const locked = f.minXp !== undefined && xp < f.minXp
            return (
              <button
                key={f.id}
                onClick={() => !locked && setSelectedFrame(f.id)}
                disabled={locked}
                className={`p-3 rounded-xl text-center transition-all ${
                  locked
                    ? 'bg-[var(--surface-raised)] opacity-30 cursor-not-allowed'
                    : selectedFrame === f.id
                      ? 'bg-sky-500/20 border border-sky-500/30'
                      : 'bg-[var(--surface-raised)] hover:bg-[var(--sidebar-hover-bg)]'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-[var(--sidebar-hover-bg)] mx-auto ${f.ring}`} />
                <p className="text-xs text-muted mt-1">{f.label}</p>
                {locked && <p className="text-[11px] text-red-400">{f.minXp} XP</p>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Emoji */}
      <div className="fl-card-static p-7">
        <h3 className="text-section-title mb-3" style={{ color: 'var(--text-primary)' }}>رمز مخصص (اختياري)</h3>
        <div className="flex items-center gap-3">
          <input
            value={displayEmoji}
            onChange={(e) => setDisplayEmoji(e.target.value.slice(0, 2))}
            className="input-field w-20 text-center text-2xl"
            placeholder="😎"
            maxLength={2}
          />
          <button onClick={() => setDisplayEmoji('')} className="btn-ghost text-xs">
            مسح
          </button>
          <p className="text-xs text-muted">سيظهر بدلاً من الحرف الأول</p>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
      >
        {saveMutation.isPending ? (
          <><Loader2 size={14} className="animate-spin" /> جاري الحفظ...</>
        ) : saved ? (
          <><CheckCircle2 size={14} /> تم الحفظ!</>
        ) : (
          <><Save size={14} /> حفظ التخصيص</>
        )}
      </button>
    </div>
  )
}

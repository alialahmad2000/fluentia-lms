import { useState, useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Volume2, ChevronDown, GraduationCap, Rocket, Truck, HeartPulse, HeartHandshake, Briefcase, BookOpen, Code2, Cpu, Globe, Database, Library, Sparkles, Smile, HelpCircle, Car, Wrench, Banknote, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useG } from '../../i18n/gender'
import { supabase } from '../../lib/supabase'
import { pronounceWord, stopPronunciation } from '../../lib/audio/pronounceWord'
import AuroraBackground from '../../design-system/components/AuroraBackground'
import GlassPanel from '../../design-system/components/GlassPanel'
import { ListSkeleton } from '../../components/ui/PageSkeleton'

// The student's 5 Business-Administration courses. `source` matches the vocab_cards tag.
// context/vehicle for developing English — the words are entry-level & concrete (A2).
const COURSE_CATALOG = [
  { source: 'uni:ENT325', code: 'ENT 325', name_ar: 'ريادة الأعمال',                       accent: '#f5b942', Icon: Rocket },
  { source: 'uni:SCM341', code: 'SCM 341', name_ar: 'إدارة سلاسل الإمداد',                   accent: '#38bdf8', Icon: Truck },
  { source: 'uni:HCM345', code: 'HCM 345', name_ar: 'مقدمة في إدارة الرعاية الصحية',         accent: '#34d399', Icon: HeartPulse },
  { source: 'uni:NPF323', code: 'NPF 323', name_ar: 'إدارة المنظمات غير الهادفة للربح',      accent: '#fb7185', Icon: HeartHandshake },
  { source: 'uni:MGT303', code: 'MGT 303', name_ar: 'مهارات التأهيل المهني في إدارة الأعمال', accent: '#a78bfa', Icon: Briefcase },
  // IT / Computer-Science collections (تقنية المعلومات وعلوم الحاسب)
  { source: 'uni:CS-PROG', code: 'PROGRAMMING', name_ar: 'أساسيات البرمجة',            accent: '#38bdf8', Icon: Code2 },
  { source: 'uni:CS-COMP', code: 'HARDWARE',    name_ar: 'الحاسب ومكوّناته',           accent: '#a78bfa', Icon: Cpu },
  { source: 'uni:CS-WEB',  code: 'INTERNET',    name_ar: 'الإنترنت والويب',             accent: '#34d399', Icon: Globe },
  { source: 'uni:CS-DATA', code: 'DATA & AI',   name_ar: 'البيانات والذكاء الاصطناعي',  accent: '#f5b942', Icon: Database },
  // School-library collections (مكتبة مدرسية) — أنوار
  { source: 'uni:LIB-DESK',  code: 'LIBRARY',   name_ar: 'مكتبتي واستعارة الكتب',      accent: '#f5b942', Icon: Library },
  { source: 'uni:LIB-STORY', code: 'STORIES',   name_ar: 'قصص وحكايات',                 accent: '#fb7185', Icon: Sparkles },
  { source: 'uni:LIB-FEEL',  code: 'FEELINGS',  name_ar: 'مشاعر وشخصيات',               accent: '#eab308', Icon: Smile },
  { source: 'uni:LIB-ASK',   code: 'QUESTIONS', name_ar: 'أسئلة الطالبات',              accent: '#a78bfa', Icon: HelpCircle },
  // Automotive-business collections (السيارات والصيانة والأعمال) — ظافر
  { source: 'uni:AUTO-CARS', code: 'CARS',      name_ar: 'السيارة وأجزاؤها',            accent: '#38bdf8', Icon: Car },
  { source: 'uni:AUTO-SHOP', code: 'WORKSHOP',  name_ar: 'الورشة والصيانة',             accent: '#34d399', Icon: Wrench },
  { source: 'uni:BIZ-FIN',   code: 'FINANCE',   name_ar: 'المال والحسابات',             accent: '#4ade80', Icon: Banknote },
  { source: 'uni:BIZ-GROW',  code: 'GROWTH',    name_ar: 'نمو الأعمال والعملاء',        accent: '#f59e0b', Icon: TrendingUp },
]

const MASTERY = {
  mastered: { label: 'متقنة', color: '#4ade80' },
  learning: { label: 'قيد التعلّم', color: '#fbbf24' },
  new: { label: 'جديدة', color: '#8c95b8' },
}

// Bold the target word inside its example sentence.
function highlightWord(sentence, word) {
  if (!sentence || !word) return sentence
  const re = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\w*)`, 'i')
  const parts = sentence.split(re)
  return parts.map((p, i) =>
    re.test(p) && p.toLowerCase().startsWith(word.toLowerCase())
      ? <strong key={i} style={{ color: 'var(--ds-text-primary)', fontWeight: 700 }}>{p}</strong>
      : <span key={i}>{p}</span>
  )
}

function WordRow({ card, accent, studentId, playing, onPlay, isLast }) {
  const isPlaying = playing === card.id
  const m = MASTERY[card.mastery_level] || MASTERY.new
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 4px',
        borderBottom: isLast ? 'none' : '1px solid var(--ds-border-subtle)',
      }}
    >
      <button
        onClick={() => onPlay(card)}
        aria-label={`استماع لكلمة ${card.word}`}
        style={{
          flexShrink: 0, width: 44, height: 44, borderRadius: 13,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          background: isPlaying ? accent : `${accent}1f`,
          border: `1px solid ${accent}55`,
          color: isPlaying ? '#0a0a0a' : accent,
          transition: 'all .18s ease',
        }}
      >
        <Volume2 size={18} className={isPlaying ? 'animate-pulse' : ''} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span dir="ltr" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: "'Playfair Display', serif" }}>
            {card.word}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: accent }}>{card.meaning_ar}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: m.color,
            background: `${m.color}1a`, border: `1px solid ${m.color}44`,
            borderRadius: 999, padding: '2px 10px', marginInlineStart: 'auto',
          }}>{m.label}</span>
        </div>
        {card.meaning_en && (
          <p dir="ltr" style={{ fontSize: 13.5, color: 'var(--ds-text-secondary)', margin: '4px 0 0', lineHeight: 1.5, textAlign: 'left' }}>
            {card.meaning_en}
          </p>
        )}
        {card.context_sentence && (
          <p dir="ltr" style={{ fontSize: 13.5, color: 'var(--ds-text-secondary)', margin: '4px 0 0', lineHeight: 1.55, fontStyle: 'italic', textAlign: 'left' }}>
            {highlightWord(card.context_sentence, card.word)}
          </p>
        )}
      </div>
    </div>
  )
}

function CollectionCard({ course, cards, studentId, index, playing, onPlay }) {
  const [open, setOpen] = useState(index === 0) // first collection open by default
  const reduce = useReducedMotion()
  const { Icon, accent } = course
  const mastered = cards.filter((c) => c.mastery_level === 'mastered').length
  const pct = cards.length ? Math.round((mastered / cards.length) * 100) : 0

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassPanel elevation={2} padding="lg" hover style={{ overflow: 'hidden', position: 'relative' }}>
        {/* accent edge */}
        <div aria-hidden style={{ position: 'absolute', insetBlock: 0, insetInlineStart: 0, width: 3, background: accent, opacity: 0.85 }} />

        <button
          onClick={() => setOpen((v) => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: 'transparent', border: 0, textAlign: 'start', padding: 0 }}
        >
          <span style={{
            flexShrink: 0, width: 52, height: 52, borderRadius: 15, display: 'grid', placeItems: 'center',
            background: `linear-gradient(150deg, ${accent}2e, ${accent}0a)`, border: `1px solid ${accent}55`,
            color: accent, boxShadow: `0 8px 22px -10px ${accent}88`,
          }}>
            <Icon size={24} />
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ds-text-primary)', fontFamily: "'Tajawal', sans-serif", margin: 0 }}>
                {course.name_ar}
              </h3>
              <span dir="ltr" style={{
                fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: accent,
                background: `${accent}1a`, border: `1px solid ${accent}44`, borderRadius: 8, padding: '2px 8px',
              }}>{course.code}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>{cards.length} كلمة</span>
              <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--ds-text-tertiary)' }} />
              <span style={{ fontSize: 13, color: 'var(--ds-text-tertiary)' }}>{mastered} متقنة</span>
              {/* progress bar */}
              <span style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--ds-surface-1)', overflow: 'hidden', marginInlineStart: 6 }}>
                <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: accent, borderRadius: 999, transition: 'width .5s ease' }} />
              </span>
            </div>
          </div>

          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }}>
            <ChevronDown size={20} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: 14, paddingTop: 4 }}>
                {cards.map((card, i) => (
                  <WordRow key={card.id} card={card} accent={accent} studentId={studentId} playing={playing} onPlay={onPlay} isLast={i === cards.length - 1} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </motion.div>
  )
}

export default function CourseVocabulary() {
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const profileId = profile?.id
  const g = useG()
  const [playing, setPlaying] = useState(null)
  const reduce = useReducedMotion()

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['course-vocab', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vocab_cards')
        .select('id, word, meaning_ar, meaning_en, context_sentence, source, mastery_level')
        .eq('student_id', profileId)
        .like('source', 'uni:%')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!profileId,
    staleTime: 60_000,
  })

  const collections = useMemo(() => {
    const bySource = new Map()
    for (const c of cards) {
      if (!bySource.has(c.source)) bySource.set(c.source, [])
      bySource.get(c.source).push(c)
    }
    return COURSE_CATALOG
      .map((course) => ({ course, cards: bySource.get(course.source) || [] }))
      .filter((g) => g.cards.length > 0)
  }, [cards])

  const totals = useMemo(() => ({
    words: cards.length,
    mastered: cards.filter((c) => c.mastery_level === 'mastered').length,
    learning: cards.filter((c) => c.mastery_level === 'learning').length,
  }), [cards])

  const onPlay = useCallback((card) => {
    stopPronunciation()
    setPlaying(card.id)
    pronounceWord(card.word, { studentId: profileId }).finally(() => {
      setPlaying((cur) => (cur === card.id ? null : cur))
    })
  }, [profileId])

  return (
    <div dir="rtl" style={{ position: 'relative', minHeight: '60vh' }}>
      <AuroraBackground />

      <div style={{ position: 'relative', maxWidth: 860, margin: '0 auto', padding: 'var(--space-4)' }}>
        {/* Hero */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{
              width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center',
              background: 'linear-gradient(150deg, var(--ds-accent-primary-glow), transparent)',
              border: '1px solid var(--ds-border-strong)', color: 'var(--ds-accent-primary)',
            }}>
              <GraduationCap size={24} />
            </span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--ds-accent-primary)', margin: 0, textTransform: 'uppercase' }}>
                {g('مساراتك الجامعية', 'مساراتكِ الجامعية')}
              </p>
              <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800, color: 'var(--ds-text-primary)', fontFamily: "'Tajawal', sans-serif", margin: '2px 0 0', lineHeight: 1.2 }}>
                مفردات مقرّراتي
              </h1>
            </div>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ds-text-secondary)', lineHeight: 1.7, maxWidth: 640, margin: 0 }}>
            {g(
              'مفردات إنجليزية بسيطة مرتبطة بمجالك ومقرّراتك. الهدف تطوير إنجليزيّتك، ومجالك هو السياق. اضغط',
              'مفردات إنجليزية بسيطة مرتبطة بمجالكِ ومقرّراتكِ. الهدف تطوير إنجليزيّتكِ، ومجالكِ هو السياق. اضغطي'
            )} <Volume2 size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> لسماع نطق أي كلمة.
          </p>

          {/* stat strip */}
          {!isLoading && collections.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              {[
                { n: totals.words, l: 'كلمة', c: 'var(--ds-accent-primary)' },
                { n: collections.length, l: 'مسار', c: 'var(--ds-accent-secondary)' },
                { n: totals.mastered, l: 'متقنة', c: '#4ade80' },
              ].map((s) => (
                <GlassPanel key={s.l} elevation={1} padding="sm" style={{ flex: '1 1 120px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.c, fontFamily: "'Playfair Display', serif" }}>{s.n}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ds-text-tertiary)', marginTop: 2 }}>{s.l}</div>
                </GlassPanel>
              ))}
            </div>
          )}
        </motion.div>

        {/* Body */}
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : collections.length === 0 ? (
          <GlassPanel elevation={2} padding="xl" style={{ textAlign: 'center' }}>
            <span style={{
              width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', margin: '0 auto 16px',
              background: 'linear-gradient(150deg, var(--ds-accent-primary-glow), transparent)',
              border: '1px solid var(--ds-border-strong)', color: 'var(--ds-accent-primary)',
            }}>
              <BookOpen size={26} />
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)', margin: '0 0 6px' }}>لا توجد مسارات بعد</h3>
            <p style={{ fontSize: 14, color: 'var(--ds-text-secondary)', margin: 0 }}>
              {g('مفردات مقرّراتك الجامعية ستظهر هنا فور إضافتها لحسابك.', 'مفردات مقرّراتكِ الجامعية ستظهر هنا فور إضافتها لحسابكِ.')}
            </p>
          </GlassPanel>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {collections.map(({ course, cards: cCards }, i) => (
              <CollectionCard
                key={course.source}
                course={course}
                cards={cCards}
                studentId={profileId}
                index={i}
                playing={playing}
                onPlay={onPlay}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

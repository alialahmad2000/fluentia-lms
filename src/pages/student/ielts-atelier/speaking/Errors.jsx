import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Mic, AlertTriangle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { useStudentId } from '../_helpers/resolveStudentId'
import { LabHeader, Card } from '../_ui/primitives'

const BASE = '/student/ielts-atelier'

// ─── أخطاء شائعة في المحادثة ─────────────────────────────────────────────────
// Reading and listening close their loop with «أخطائي» — a bank of the student's
// OWN wrong answers. Speaking cannot do that yet and it would be dishonest to
// pretend otherwise: ielts_skill_sessions holds 0 speaking rows platform-wide and
// ielts_error_bank has 0 speaking rows, because speaking is graded from audio and
// never wrote per-item errors. Naming this page «أخطائي» would promise her a
// personal record that does not exist.
//
// So it is «أخطاء شائعة», and it is built from real content rather than an empty
// query: band_descriptors.common_mistakes_ar carries 20/20 part-2 topics of
// خطأ→صح corrections written for Arabic speakers. Her own graded sessions are
// shown ABOVE that bank whenever they exist, so the page upgrades itself from
// general to personal the moment she records anything.

// "خطأ: She teached me → صح: She taught me" → a rendered pair.
// Anything that does not match that shape is advice, and is rendered as advice.
const PAIR_RE = /^\s*خطأ\s*:\s*(.+?)\s*(?:→|->|←)\s*صح\s*:\s*(.+?)\s*$/

function parseMistake(line) {
  const m = PAIR_RE.exec(String(line || ''))
  if (m) return { kind: 'pair', wrong: m[1].trim(), right: m[2].trim() }
  return { kind: 'advice', text: String(line || '').trim() }
}

function useCommonMistakes() {
  return useQuery({
    queryKey: ['ielts-speaking-common-mistakes'],
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_speaking_questions')
        .select('id, part, topic, band_descriptors, sort_order')
        .eq('is_published', true)
        .order('part')
        .order('sort_order')
      if (error) throw error
      return (data || [])
        .map((r) => ({
          id: r.id,
          part: r.part,
          topic: r.topic,
          items: (r.band_descriptors?.common_mistakes_ar || []).map(parseMistake),
        }))
        .filter((r) => r.items.length)
    },
  })
}

function useMySpeakingSessions(studentId) {
  return useQuery({
    queryKey: ['ielts-speaking-sessions', studentId],
    enabled: !!studentId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('id, question_type, band_score, completed_at')
        .eq('student_id', studentId)
        .eq('skill_type', 'speaking')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data || []
    },
  })
}

// Part 1 topics are bilingual ("Home & Accommodation / المنزل والسكن"); part 2
// and 3 are English only. Without a fallback those cards were titled by a small
// grey subtitle and nothing else, so promote the English to the heading when
// there is no Arabic half.
const splitTopic = (t) => {
  const s = String(t || '')
  const i = s.indexOf('/')
  return i === -1 ? { en: s.trim(), ar: '', enIsTitle: true } : { en: s.slice(0, i).trim(), ar: s.slice(i + 1).trim(), enIsTitle: false }
}

export default function SpeakingErrors() {
  const g = useG()
  const navigate = useNavigate()
  const studentId = useStudentId()
  const { data: topics = [], isLoading } = useCommonMistakes()
  const { data: sessions = [] } = useMySpeakingSessions(studentId)

  const totals = useMemo(() => {
    let pairs = 0
    for (const t of topics) pairs += t.items.filter((i) => i.kind === 'pair').length
    return { topics: topics.length, pairs }
  }, [topics])

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40, maxWidth: 940 }}>
      <LabHeader eyebrow="حلقة الإغلاق · قبل أن تتكلّمي" title="أخطاء شائعة في المحادثة">
        {g('هذه الأخطاء يقع فيها المتحدثون بالعربية تحديداً، وكلٌّ منها يُخصم من معيار «القواعد ودقّتها». اقرأها قبل جلستك — تصحيح خطأ متكرّر واحد أرفع لدرجتك من موضوع جديد.',
           'هذه الأخطاء تقع فيها المتحدثات بالعربية تحديداً، وكلٌّ منها يُخصم من معيار «القواعد ودقّتها». اقرئيها قبل جلستك — تصحيح خطأ متكرّر واحد أرفع لدرجتك من موضوع جديد.')}
      </LabHeader>

      {/* Her own record when it exists; otherwise say plainly that it does not. */}
      {sessions.length > 0 ? (
        <Card style={{ padding: '15px 17px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 10 }}>جلساتك الأخيرة</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sessions.map((s) => (
              <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 9, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', fontSize: 12 }}>
                <span style={{ color: 'var(--iel-ink-3)' }}>{s.question_type || 'جلسة'}</span>
                <b style={{ color: 'var(--iel-ink)' }}>{s.band_score != null ? Number(s.band_score).toFixed(1) : '—'}</b>
              </span>
            ))}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: '13px 15px', display: 'flex', gap: 9, alignItems: 'flex-start', borderColor: 'color-mix(in oklab, var(--iel-accent) 24%, var(--iel-border))' }}>
          <Info size={14} style={{ color: 'var(--iel-accent-ink)', flex: 'none', marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.85 }}>
            {g('لم تُسجّل جلسة محادثة بعد، فلا سجلّ أخطاء خاصاً بك حتى الآن. ما تحته أخطاء عامّة — وحين تُسجّل أول جلسة ستظهر نتائجك هنا فوقها.',
               'لم تُسجّلي جلسة محادثة بعد، فلا سجلّ أخطاء خاصاً بكِ حتى الآن. ما تحته أخطاء عامّة — وحين تُسجّلين أول جلسة ستظهر نتائجك هنا فوقها.')}
          </div>
        </Card>
      )}

      {!isLoading && totals.topics > 0 && (
        <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', paddingInlineStart: 3 }}>
          {totals.pairs} تصحيحاً عبر {totals.topics} موضوعاً
        </div>
      )}

      {isLoading ? (
        <Card style={{ padding: 26, color: 'var(--iel-ink-3)', fontSize: 13 }}>…</Card>
      ) : topics.length === 0 ? (
        <Card style={{ padding: '30px 22px', textAlign: 'center' }}>
          <Mic size={26} style={{ color: 'var(--iel-ink-3)', marginBottom: 10 }} />
          <div style={{ fontSize: 13, color: 'var(--iel-ink-3)', lineHeight: 1.85 }}>لا محتوى بعد لهذه الصفحة.</div>
        </Card>
      ) : (
        topics.map((t) => {
          const { en, ar, enIsTitle } = splitTopic(t.topic)
          return (
            <Card key={t.id} style={{ padding: '15px 17px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11, flexWrap: 'wrap' }}>
                <AlertTriangle size={14} style={{ color: 'var(--iel-gold-ink)', flex: 'none' }} />
                {ar && <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--iel-ink)' }}>{ar}</span>}
                <span
                  dir="ltr"
                  style={enIsTitle
                    ? { fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)' }
                    : { fontSize: 11, color: 'var(--iel-ink-3)', fontWeight: 600 }}
                >
                  {en}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {t.items.map((it, i) =>
                  it.kind === 'pair' ? (
                    <div key={i} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)' }}>
                      <span dir="ltr" style={{ color: 'var(--iel-bad)', textDecoration: 'line-through', fontSize: 12.5, fontFamily: '-apple-system, Arial, sans-serif' }}>
                        {it.wrong}
                      </span>
                      <span dir="ltr" style={{ color: 'var(--iel-good)', fontWeight: 700, fontSize: 12.5, fontFamily: '-apple-system, Arial, sans-serif' }}>
                        {it.right}
                      </span>
                    </div>
                  ) : (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--iel-gold-soft, rgba(234,179,8,.09))', border: '1px solid color-mix(in oklab, var(--iel-gold) 22%, transparent)', fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>
                      {it.text}
                    </div>
                  ),
                )}
              </div>
            </Card>
          )
        })
      )}

      <button
        onClick={() => navigate(`${BASE}/speaking`)}
        style={{ alignSelf: 'flex-start', padding: '11px 18px', borderRadius: 11, border: 0, cursor: 'pointer', background: 'var(--iel-accent)', color: '#fff', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 800 }}
      >
        {g('ابدأ جلسة محادثة', 'ابدئي جلسة محادثة')}
      </button>
    </div>
  )
}

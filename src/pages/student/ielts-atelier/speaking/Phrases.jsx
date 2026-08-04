import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Quote, Ruler, Lightbulb } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { LabHeader, Card } from '../_ui/primitives'

const BASE = '/student/ielts-atelier'

// ─── عبارات وتراكيب ──────────────────────────────────────────────────────────
// ielts_speaking_questions carries three fields per topic that the booth fetched
// or held but never showed the student:
//   useful_phrases          60/60 topics × 5 = 300 phrases (SELECTed, never rendered)
//   band_descriptors.grammar / .grammar_structures   60/60 — the structures the
//                           topic is designed to elicit
//   band_descriptors.arabic_tip / .arabic_tips       40/60 (parts 1 and 3)
// That is the single largest piece of written speaking content in the product,
// and it was invisible. This page is that library.
//
// It is deliberately NOT a "model answers" page: model_answer_text is a 60–180
// character «Grammar focus: …» note on every row, not an answer, and
// model_answer_audio_url is null on all 60. Building نماذج مشروحة here would
// have promised something the data cannot deliver.

const PART_AR = { 1: 'الجزء الأول', 2: 'الجزء الثاني', 3: 'الجزء الثالث' }
const PART_HINT = {
  1: 'أسئلة قصيرة عن حياتك — الهدف جملتان أو ثلاث لكل سؤال، لا كلمة واحدة.',
  2: 'الحديث الطويل — دقيقة تحضير ثم دقيقتان بلا مقاطعة.',
  3: 'نقاش مجرّد يتفرّع من موضوع الجزء الثاني — آراء وأسباب، لا تجارب شخصية.',
}

// Key spellings AND types differ by part, which is easy to miss and renders
// badly rather than failing loudly:
//   part 1 → grammar: STRING,            arabic_tip:  string
//   part 2 → grammar_structures: ARRAY,  (no tip)
//   part 3 → grammar_structures: ARRAY,  arabic_tips: string
// Handing React the raw array printed the entries with no separator at all
// ("…the storyPresent simple for recommendingReported speech…"), so normalise to
// an array of lines and render them as a list.
const readGrammar = (bd) => {
  const v = bd?.grammar ?? bd?.grammar_structures
  if (v == null) return []
  return (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean)
}
const readTip = (bd) => {
  const t = bd?.arabic_tip ?? bd?.arabic_tips
  if (t == null) return null
  return Array.isArray(t) ? t.join(' · ') : String(t)
}

function useSpeakingPhrases() {
  return useQuery({
    queryKey: ['ielts-speaking-phrases'],
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_speaking_questions')
        .select('id, part, topic, useful_phrases, band_descriptors, sort_order')
        .eq('is_published', true)
        .order('part')
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

// Topics arrive as "Home & Accommodation / المنزل والسكن" — split so each side
// carries its own direction instead of rendering one mixed-direction string.
// Parts 2 and 3 are English only, so mark those to be promoted to the heading;
// otherwise those cards would have no title at all, only a grey subtitle.
function splitTopic(topic) {
  const s = String(topic || '')
  const i = s.indexOf('/')
  if (i === -1) return { en: s.trim(), ar: '', enIsTitle: true }
  return { en: s.slice(0, i).trim(), ar: s.slice(i + 1).trim(), enIsTitle: false }
}

export default function SpeakingPhrases() {
  const g = useG()
  const navigate = useNavigate()
  const { data: rows = [], isLoading } = useSpeakingPhrases()
  const [part, setPart] = useState(0) // 0 = all
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (part && r.part !== part) return false
      if (!needle) return true
      const hay = [r.topic, ...(r.useful_phrases || []), readGrammar(r.band_descriptors) || '']
        .join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [rows, part, q])

  const totalPhrases = useMemo(
    () => rows.reduce((n, r) => n + (r.useful_phrases?.length || 0), 0),
    [rows],
  )

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40, maxWidth: 980 }}>
      <LabHeader eyebrow="التعلّم · مكتبة العبارات" title="عبارات وتراكيب">
        {g('لكل موضوع في الامتحان عبارات يتوقّعها المصحّح وتراكيب صُمّم السؤال ليستخرجها منك. هنا كلاهما، مرتّبين بالموضوع — اقرأ موضوعك قبل الجلسة، لا بعدها.',
           'لكل موضوع في الامتحان عبارات يتوقّعها المصحّح وتراكيب صُمّم السؤال ليستخرجها منكِ. هنا كلاهما، مرتّبان بالموضوع — اقرئي موضوعك قبل الجلسة، لا بعدها.')}
      </LabHeader>

      <Card style={{ padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPart(p)}
              style={{
                padding: '7px 13px', borderRadius: 9, cursor: 'pointer',
                fontFamily: "'Tajawal', sans-serif", fontSize: 12.5, fontWeight: 800,
                border: `1px solid ${part === p ? 'transparent' : 'var(--iel-border)'}`,
                background: part === p ? 'var(--iel-accent)' : 'transparent',
                color: part === p ? '#fff' : 'var(--iel-ink-2)',
              }}
            >
              {p === 0 ? 'الكل' : PART_AR[p]}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 190 }}>
          <Search size={14} style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--iel-ink-3)', pointerEvents: 'none' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في العبارات أو المواضيع…"
            style={{
              width: '100%', padding: '9px 34px 9px 12px', borderRadius: 9,
              border: '1px solid var(--iel-border)', background: 'var(--iel-surface-2)',
              color: 'var(--iel-ink)', fontFamily: "'Tajawal', sans-serif", fontSize: 13, outline: 'none',
            }}
          />
        </div>
      </Card>

      {!isLoading && (
        <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', paddingInlineStart: 3 }}>
          {filtered.length} موضوعاً · {totalPhrases} عبارة في المكتبة
        </div>
      )}

      {part !== 0 && (
        <Card style={{ padding: '12px 15px', fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.8, borderColor: 'color-mix(in srgb, var(--iel-accent) 26%, var(--iel-border))' }}>
          {PART_HINT[part]}
        </Card>
      )}

      {isLoading ? (
        <Card style={{ padding: 26, color: 'var(--iel-ink-3)', fontSize: 13 }}>…</Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: '26px 20px', textAlign: 'center', fontSize: 13, color: 'var(--iel-ink-3)' }}>
          لا نتائج لهذا البحث.
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filtered.map((r) => {
            const { en, ar, enIsTitle } = splitTopic(r.topic)
            const grammar = readGrammar(r.band_descriptors)
            const tip = readTip(r.band_descriptors)
            return (
              <Card key={r.id} style={{ padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)' }}>
                      {PART_AR[r.part]}
                    </span>
                  </div>
                  {ar && <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>{ar}</div>}
                  <div
                    dir="ltr"
                    style={enIsTitle
                      ? { fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', textAlign: 'start', lineHeight: 1.5 }
                      : { fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 600, textAlign: 'start' }}
                  >
                    {en}
                  </div>
                </div>

                {!!(r.useful_phrases || []).length && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, fontSize: 11.5, fontWeight: 800, color: 'var(--iel-ink-3)' }}>
                      <Quote size={12} /> عبارات جاهزة
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {r.useful_phrases.map((p, i) => (
                        <span
                          key={i}
                          dir="ltr"
                          style={{
                            fontSize: 12, padding: '4px 9px', borderRadius: 7,
                            background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)',
                            color: 'var(--iel-ink-2)', fontFamily: '-apple-system, Arial, sans-serif',
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {grammar.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Ruler size={13} style={{ color: 'var(--iel-ink-3)', flex: 'none', marginTop: 2 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--iel-ink-3)', marginBottom: 3 }}>التركيب المستهدف</div>
                      <ul dir="ltr" style={{ margin: 0, paddingInlineStart: 15, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {grammar.map((line, i) => (
                          <li key={i} style={{ fontSize: 12, color: 'var(--iel-ink-2)', lineHeight: 1.65, textAlign: 'start', fontFamily: '-apple-system, Arial, sans-serif' }}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {tip && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 11px', borderRadius: 9, background: 'var(--iel-gold-soft, rgba(234,179,8,.1))', border: '1px solid color-mix(in srgb, var(--iel-gold) 24%, transparent)' }}>
                    <Lightbulb size={13} style={{ color: 'var(--iel-gold-ink)', flex: 'none', marginTop: 2 }} />
                    <div style={{ fontSize: 12, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>{tip}</div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`${BASE}/speaking${r.part === 1 ? '' : `/part${r.part}`}`)}
                  style={{
                    marginTop: 'auto', padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
                    border: '1px solid var(--iel-border)', background: 'transparent',
                    color: 'var(--iel-ink-2)', fontFamily: "'Tajawal', sans-serif", fontSize: 12.5, fontWeight: 800,
                  }}
                >
                  {g('تدرّب على هذا الجزء', 'تدرّبي على هذا الجزء')}
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

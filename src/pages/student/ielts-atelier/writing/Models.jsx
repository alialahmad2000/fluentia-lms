import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, ListTree, Sparkles, ArrowRight, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { LabHeader, GalleryCard, MetaChip, Card } from '../_ui/primitives'

// ─── نماذج مشروحة ────────────────────────────────────────────────────────────
// Every one of the 25 published writing tasks already carries a Band 7 model
// answer, the paragraph structure that answer follows, and the phrase bank it
// draws on. None of it had a single reference anywhere in the student UI — the
// library was written, stored, and invisible. This page is that library.
//
// Deliberately NOT done here: per-sentence "this clause earns you Task
// Achievement" labels. That analysis does not exist in the data, and inventing
// it would teach students things no examiner said. What we show instead is the
// real model, the real structure it follows, the real phrase bank, and an
// honest per-criterion checklist of what to look for while reading it.

const SUB_LABEL = {
  line_graph: 'منحنى', bar_chart: 'رسم أعمدة', pie_chart: 'رسم دائري', table: 'جدول',
  process: 'عملية', map: 'خريطة', mixed: 'مختلط',
  opinion: 'رأي', discussion: 'مناقشة', problem_solution: 'مشكلة وحلّ', two_part: 'سؤالان',
}

const CRITERIA_LENS = [
  { key: 'ta', label: 'تحقيق المهمة', look: 'هل غطّى النموذج كل ما طلبه السؤال؟ في المهمة الأولى: هل فيه Overview بلا أرقام؟' },
  { key: 'cc', label: 'الترابط والتماسك', look: 'كيف انتقل بين الفقرات؟ لاحظي أنّ الروابط قليلة ومتنوّعة، لا مكرّرة في كل جملة.' },
  { key: 'lr', label: 'الثروة اللغوية', look: 'ابحثي عن المرادفات التي استبدلت كلمات السؤال بدل تكرارها حرفياً.' },
  { key: 'gra', label: 'القواعد ودقّتها', look: 'راقبي تنوّع طول الجمل: جملة قصيرة بعد طويلة، لا سلسلة جمل طويلة متتابعة.' },
]

function useWritingModels() {
  return useQuery({
    queryKey: ['ielts-writing-models'],
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_writing_tasks')
        .select('id, task_type, sub_type, title, prompt, image_url, model_answer_band7, template_structure, key_phrases, word_count_target, time_limit_minutes')
        .eq('is_published', true)
        .not('model_answer_band7', 'is', null)
        .order('task_type')
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

// template_structure has no fixed shape: Task 1 uses flat strings
// (introduction/overview/body1/body2), most Task 2 rows nest objects and arrays
// (key_arguments.for[], planning_guide.step1_analyze…). Render whatever is there
// rather than assuming a schema that only holds for half the rows.
function StructureValue({ value }) {
  if (value == null) return null
  if (Array.isArray(value)) {
    return (
      <ul style={{ margin: '4px 0 0', paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {value.map((v, i) => <li key={i} style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.75 }}>{String(v)}</li>)}
      </ul>
    )
  }
  if (typeof value === 'object') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--iel-ink-3)', letterSpacing: '.02em' }}>{prettyKey(k)}</div>
            <StructureValue value={v} />
          </div>
        ))}
      </div>
    )
  }
  return <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.8, marginTop: 2 }} dir="auto">{String(value)}</div>
}

const KEY_AR = {
  introduction: 'المقدمة', overview: 'الـ Overview', body1: 'الفقرة الأولى', body2: 'الفقرة الثانية',
  body_paragraph_1: 'الفقرة الأولى', body_paragraph_2: 'الفقرة الثانية', conclusion: 'الخاتمة',
  key_arguments: 'الحجج الأساسية', planning_guide: 'خطة الكتابة', paragraph_outline: 'هيكل الفقرات',
  for: 'مع', against: 'ضدّ',
}
const prettyKey = (k) => KEY_AR[k] || k.replace(/_/g, ' ')

export default function WritingModels() {
  const g = useG()
  const { data: tasks = [], isLoading } = useWritingModels()
  const [filter, setFilter] = useState('task1')
  const [open, setOpen] = useState(null)

  const shown = useMemo(() => tasks.filter((t) => t.task_type === filter), [tasks, filter])
  const counts = useMemo(() => ({
    task1: tasks.filter((t) => t.task_type === 'task1').length,
    task2: tasks.filter((t) => t.task_type === 'task2').length,
  }), [tasks])

  // ── Reader ────────────────────────────────────────────────────────────────
  if (open) {
    const phrases = Array.isArray(open.key_phrases) ? open.key_phrases : []
    const tmpl = open.template_structure && typeof open.template_structure === 'object' ? open.template_structure : null
    return (
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
        <button
          onClick={() => setOpen(null)}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif", fontSize: 13, fontWeight: 700 }}
        >
          <ArrowRight size={15} /> كل النماذج
        </button>

        <LabHeader eyebrow={`${open.task_type === 'task1' ? 'المهمة الأولى' : 'المهمة الثانية'} · ${SUB_LABEL[open.sub_type] || ''}`} title={open.title || 'نموذج Band 7'}>
          {g('اقرأ النموذج مرّتين: مرّة كقارئ عادي، ومرّة وأنت تسأل «لماذا هذه الجملة هنا؟».',
             'اقرئي النموذج مرّتين: مرّة كقارئة عادية، ومرّة وأنتِ تسألين «لماذا هذه الجملة هنا؟».')}
        </LabHeader>

        {/* The prompt this model answers — a model without its question teaches nothing */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--iel-ink-3)', marginBottom: 7 }}>السؤال</div>
          <div dir="auto" style={{ fontSize: 13.5, color: 'var(--iel-ink)', lineHeight: 1.9 }}>{open.prompt}</div>
          {open.image_url && (
            <img
              src={open.image_url}
              alt=""
              loading="lazy"
              style={{ marginTop: 12, width: '100%', borderRadius: 12, border: '1px solid var(--iel-border)', background: '#fff' }}
            />
          )}
        </Card>

        {/* The Band 7 answer itself */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)' }}><FileText size={14} /></span>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--iel-ink)' }}>نموذج Band 7</div>
            <MetaChip>{open.word_count_target ? `${open.word_count_target}+ كلمة` : ''}</MetaChip>
          </div>
          <div
            dir="ltr"
            style={{ fontSize: 14, lineHeight: 2.05, color: 'var(--iel-ink)', whiteSpace: 'pre-wrap', textAlign: 'start', fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
          >
            {open.model_answer_band7}
          </div>
        </Card>

        {/* What to look for, per criterion */}
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-gold-soft, rgba(234,179,8,.14))', color: 'var(--iel-gold-ink)' }}><Sparkles size={14} /></span>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--iel-ink)' }}>{g('اقرأه بعين الممتحن', 'اقرئيه بعين الممتحن')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CRITERIA_LENS.map((c) => (
              <div key={c.key} style={{ display: 'flex', gap: 10 }}>
                <span style={{ flex: 'none', marginTop: 6, width: 5, height: 5, borderRadius: '50%', background: 'var(--iel-accent)' }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--iel-ink)' }}>{c.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>{c.look}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* The structure the model follows */}
        {tmpl && (
          <Card style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)' }}><ListTree size={14} /></span>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--iel-ink)' }}>الهيكل الذي يتبعه</div>
            </div>
            <StructureValue value={tmpl} />
          </Card>
        )}

        {/* The phrase bank */}
        {phrases.length > 0 && (
          <Card style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 4 }}>عبارات مفتاحية</div>
            <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', marginBottom: 11 }}>
              {g('استعملها بمعناها، لا بحفظها حرفياً — التكرار الحرفي يُخفض الثروة اللغوية.',
                 'استعمليها بمعناها، لا بحفظها حرفياً — التكرار الحرفي يُخفض الثروة اللغوية.')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {phrases.map((p, i) => (
                <span key={i} dir="ltr" style={{ fontSize: 12, padding: '6px 11px', borderRadius: 9, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', color: 'var(--iel-ink-2)', fontFamily: "-apple-system, 'Segoe UI', Arial, sans-serif" }}>
                  {String(p)}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  // ── Gallery ───────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
      <LabHeader eyebrow="الدرجة الأولى · القدوة" title="نماذج مشروحة">
        {g('لكل مهمة إجابة Band 7 كاملة، ومعها الهيكل الذي بُنيت عليه والعبارات التي استعملتها. أسرع طريق لرفع درجتك أن ترى الجيّد ومعه سببه، لا أن تخمّنه.',
           'لكل مهمة إجابة Band 7 كاملة، ومعها الهيكل الذي بُنيت عليه والعبارات التي استعملتها. أسرع طريق لرفع درجتك أن تري الجيّد ومعه سببه، لا أن تخمّنيه.')}
      </LabHeader>

      <div style={{ display: 'flex', gap: 8, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', borderRadius: 12, padding: 4 }}>
        {[['task1', 'المهمة الأولى'], ['task2', 'المهمة الثانية']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", border: 0, transition: 'all .15s', background: filter === k ? 'var(--iel-accent)' : 'transparent', color: filter === k ? '#fff' : 'var(--iel-ink-2)' }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{l}</div>
            <div style={{ fontSize: 10.5, opacity: .85, marginTop: 2 }}>{counts[k] || 0} نموذج</div>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 118, borderRadius: 16, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', opacity: .6 }} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--iel-ink-3)', fontSize: 13.5 }}>
          لا توجد نماذج منشورة لهذا النوع بعد.
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {shown.map((t) => (
            <GalleryCard key={t.id} onClick={() => { setOpen(t); window.scrollTo({ top: 0 }) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--iel-accent-ink)', letterSpacing: '.04em' }}>
                  {SUB_LABEL[t.sub_type] || t.sub_type}
                </span>
                {t.image_url && <MetaChip icon={ImageIcon}>رسم</MetaChip>}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.45, textAlign: 'start' }}>
                {t.title}
              </div>
              <div dir="auto" style={{ fontSize: 12, color: 'var(--iel-ink-3)', lineHeight: 1.65, textAlign: 'start', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t.prompt}
              </div>
            </GalleryCard>
          ))}
        </div>
      )}
    </div>
  )
}

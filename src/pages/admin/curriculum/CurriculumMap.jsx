import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BookOpen, PenLine, Languages, Headphones, FileEdit, Mic, Volume2,
  ClipboardCheck, Download, RefreshCw, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Minus, ExternalLink, Loader2,
} from 'lucide-react'
import { useCurriculumMap, useUnitVocab } from '../../../hooks/useCurriculumMap'

const CEFR_VOCAB_TARGETS = {
  0: { min: 300, max: 500, label: 'Pre-A1' },
  1: { min: 500, max: 700, label: 'A1' },
  2: { min: 1000, max: 1500, label: 'A2' },
  3: { min: 2000, max: 2500, label: 'B1' },
  4: { min: 3200, max: 4000, label: 'B2' },
  5: { min: 5000, max: 8000, label: 'C1' },
}

const LEVEL_NAMES = {
  0: 'تأسيس', 1: 'أساسيات', 2: 'تطوير', 3: 'طلاقة', 4: 'تمكّن', 5: 'احتراف',
}

const FOCUS_TYPE_AR = {
  minimal_pairs_vowels: 'أزواج صوتية (حركات)',
  minimal_pairs_consonants: 'أزواج صوتية (حروف)',
  word_stress: 'تشديد الكلمات',
  connected_speech_linking: 'ربط الكلام',
  connected_speech_reduction: 'اختزال الأصوات',
  intonation: 'أنماط النغمة',
}

function gapStatus(actual, target) {
  const ratio = actual / target.min
  if (ratio >= 0.8) return 'green'
  if (ratio >= 0.5) return 'yellow'
  return 'red'
}

const STATUS_COLORS = {
  green: { bg: 'rgba(52,211,153,0.1)', text: 'rgb(52,211,153)', border: 'rgba(52,211,153,0.2)' },
  yellow: { bg: 'rgba(245,158,11,0.1)', text: 'rgb(245,158,11)', border: 'rgba(245,158,11,0.2)' },
  red: { bg: 'rgba(244,63,94,0.1)', text: 'rgb(244,63,94)', border: 'rgba(244,63,94,0.2)' },
}

const toAr = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

export default function CurriculumMap() {
  const { data, isLoading, error, refetch } = useCurriculumMap()
  const [expandedLevel, setExpandedLevel] = useState(null)

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8" dir="rtl">
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-sky)' }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8 text-center" dir="rtl">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-rose-400" />
        <p className="text-sm text-rose-400">فشل تحميل البيانات: {error.message}</p>
      </div>
    )
  }

  const { levels, units, vocabMap } = data
  const totalVocab = Object.values(vocabMap).reduce((s, v) => s + v.unique, 0)
  const totalGrammar = units.reduce((s, u) => s + (u.curriculum_grammar?.length || 0), 0)

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            خريطة المنهج التفصيلية
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {toAr(levels.length)} مستويات · {toAr(units.length)} وحدة · {toAr(totalVocab)} كلمة · {toAr(totalGrammar)} موضوع قواعد
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <RefreshCw size={14} />
            تحديث
          </button>
          <ExportButton data={data} />
        </div>
      </div>

      {/* Level Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {levels.map(level => {
          const levelUnits = units.filter(u => u.level_id === level.id)
          const levelVocab = levelUnits.reduce((s, u) => s + (vocabMap[u.id]?.unique || 0), 0)
          const target = CEFR_VOCAB_TARGETS[level.level_number] || CEFR_VOCAB_TARGETS[0]
          const status = gapStatus(levelVocab, target)
          const sc = STATUS_COLORS[status]
          const isExpanded = expandedLevel === level.id

          return (
            <button
              key={level.id}
              onClick={() => setExpandedLevel(isExpanded ? null : level.id)}
              className="fl-card-static p-4 text-start transition-all cursor-pointer"
              style={isExpanded ? { borderColor: 'var(--accent-sky)', boxShadow: 'var(--shadow-glow-sky)' } : {}}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.text }}>
                  {target.label}
                </span>
                <span className="text-[10px] font-data" style={{ color: 'var(--text-tertiary)' }}>L{level.level_number}</span>
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {LEVEL_NAMES[level.level_number]}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {toAr(levelUnits.length)} وحدة · {toAr(levelVocab)} كلمة
              </p>
              <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: 'var(--text-tertiary)' }}>الهدف: {toAr(target.min)}</span>
                  <span style={{ color: sc.text, fontWeight: 700 }}>
                    {levelVocab >= target.min ? '+' : ''}{toAr(levelVocab - target.min)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (levelVocab / target.min) * 100)}%`, background: sc.text }}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Deep Dive */}
      <AnimatePresence>
        {expandedLevel && (
          <LevelDeepDive
            level={levels.find(l => l.id === expandedLevel)}
            units={units.filter(u => u.level_id === expandedLevel)}
            vocabMap={vocabMap}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Level Deep Dive ───
function LevelDeepDive({ level, units, vocabMap }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="fl-card-static p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          المستوى {level.level_number} — {level.cefr} "{LEVEL_NAMES[level.level_number]}"
        </h2>
        <div className="space-y-3">
          {units
            .sort((a, b) => a.unit_number - b.unit_number)
            .map(unit => (
              <UnitDetailCard key={unit.id} unit={unit} vocabCount={vocabMap[unit.id]?.unique || 0} />
            ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Unit Detail Card ───
function UnitDetailCard({ unit, vocabCount }) {
  const [expanded, setExpanded] = useState(false)
  const [showVocab, setShowVocab] = useState(false)
  const { data: vocabList, isLoading: vocabLoading } = useUnitVocab(unit.id, showVocab)

  const readings = unit.curriculum_readings || []
  const readingA = readings.find(r => r.reading_label === 'A' || r.reading_label === 'a')
  const readingB = readings.find(r => r.reading_label === 'B' || r.reading_label === 'b')
  const grammar = unit.curriculum_grammar?.[0]
  const writing = unit.curriculum_writing?.[0]
  const speaking = unit.curriculum_speaking?.[0]
  const listening = unit.curriculum_listening?.[0]
  const pronunciation = unit.curriculum_pronunciation?.[0]
  const assessment = unit.curriculum_assessments?.[0]
  const questionCount = assessment?.questions ? (Array.isArray(assessment.questions) ? assessment.questions.length : 0) : 0

  return (
    <div
      className="rounded-xl transition-all"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-start cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold font-data px-2 py-1 rounded-lg shrink-0" style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}>
            U{unit.unit_number}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {unit.theme_en}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{unit.theme_ar}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-data" style={{ color: 'var(--text-tertiary)' }}>
            {toAr(vocabCount)} كلمة
          </span>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
        </div>
      </button>

      {/* Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Reading A */}
                <MetricRow
                  icon={<BookOpen size={14} />}
                  label="القراءة A"
                  value={readingA ? `${toAr(readingA.passage_word_count || 0)} كلمة` : '—'}
                  status={readingA ? 'ok' : 'missing'}
                />
                {/* Reading B */}
                <MetricRow
                  icon={<BookOpen size={14} />}
                  label="القراءة B"
                  value={readingB ? `${toAr(readingB.passage_word_count || 0)} كلمة` : '—'}
                  status={readingB ? 'ok' : 'missing'}
                />
                {/* Grammar */}
                <MetricRow
                  icon={<PenLine size={14} />}
                  label="القواعد"
                  value={grammar ? `${grammar.topic_name_en}` : '—'}
                  status={grammar ? 'ok' : 'missing'}
                />
                {/* Writing */}
                <MetricRow
                  icon={<FileEdit size={14} />}
                  label="الكتابة"
                  value={writing ? `${writing.task_type || 'paragraph'} (${toAr(writing.word_count_min || 0)}-${toAr(writing.word_count_max || 0)})` : '—'}
                  status={writing ? 'ok' : 'missing'}
                />
                {/* Speaking */}
                <MetricRow
                  icon={<Mic size={14} />}
                  label="المحادثة"
                  value={speaking ? `${speaking.topic_type || 'monologue'} (${toAr(speaking.min_duration_seconds || 0)}-${toAr(speaking.max_duration_seconds || 0)}s)` : '—'}
                  status={speaking ? 'ok' : 'missing'}
                />
                {/* Listening */}
                <MetricRow
                  icon={<Headphones size={14} />}
                  label="الاستماع"
                  value={listening?.audio_url ? 'صوت متوفر' : 'لا يوجد صوت'}
                  status={listening?.audio_url ? 'ok' : 'warning'}
                />
                {/* Pronunciation */}
                <MetricRow
                  icon={<Volume2 size={14} />}
                  label="النطق"
                  value={pronunciation ? (FOCUS_TYPE_AR[pronunciation.focus_type] || pronunciation.focus_type) : '—'}
                  status={pronunciation ? 'ok' : 'missing'}
                />
                {/* Assessment */}
                <MetricRow
                  icon={<ClipboardCheck size={14} />}
                  label="التقييم"
                  value={assessment ? `${toAr(questionCount)} سؤال` : '—'}
                  status={assessment ? 'ok' : 'missing'}
                />
              </div>

              {/* Vocab + Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => setShowVocab(!showVocab)}
                  className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}
                >
                  {showVocab ? 'إخفاء الكلمات' : 'عرض الكلمات'} ({toAr(vocabCount)})
                </button>
                <Link
                  to={`/admin/curriculum/unit/${unit.id}`}
                  className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  تعديل <ExternalLink size={10} />
                </Link>
              </div>

              {/* Vocab List */}
              <AnimatePresence>
                {showVocab && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {vocabLoading ? (
                      <div className="py-4 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--accent-sky)' }} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pt-2 max-h-[400px] overflow-y-auto">
                        {(vocabList || []).map((w, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <span className="font-bold font-['Inter'] shrink-0" style={{ color: 'var(--accent-sky)' }}>{w.word}</span>
                            <span className="truncate" style={{ color: 'var(--text-tertiary)' }}>{w.definition_ar}</span>
                            {w.part_of_speech && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}>
                                {w.part_of_speech}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Metric Row ───
function MetricRow({ icon, label, value, status }) {
  const statusIcon = status === 'ok' ? (
    <CheckCircle size={12} className="text-emerald-400 shrink-0" />
  ) : status === 'warning' ? (
    <AlertTriangle size={12} className="text-amber-400 shrink-0" />
  ) : (
    <Minus size={12} style={{ color: 'var(--text-tertiary)' }} className="shrink-0" />
  )

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <span className="font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}:</span>
      <span className="truncate" style={{ color: 'var(--text-primary)' }}>{value}</span>
      {statusIcon}
    </div>
  )
}

// ─── Export Button ───
function ExportButton({ data }) {
  const handleExport = () => {
    const { levels, units, vocabMap } = data
    let md = '# Fluentia Curriculum Map\n\n'
    md += `Generated: ${new Date().toISOString()}\n\n`
    md += `## Summary\n`
    md += `- Levels: ${levels.length}\n`
    md += `- Units: ${units.length}\n`
    md += `- Total Vocabulary: ${Object.values(vocabMap).reduce((s, v) => s + v.unique, 0)}\n\n`

    for (const level of levels) {
      const target = CEFR_VOCAB_TARGETS[level.level_number]
      const levelUnits = units.filter(u => u.level_id === level.id).sort((a, b) => a.unit_number - b.unit_number)
      const levelVocab = levelUnits.reduce((s, u) => s + (vocabMap[u.id]?.unique || 0), 0)

      md += `---\n\n## Level ${level.level_number} — ${level.cefr} (${LEVEL_NAMES[level.level_number]})\n\n`
      md += `- Units: ${levelUnits.length}\n`
      md += `- Vocabulary: ${levelVocab} / ${target.min} target (gap: ${levelVocab - target.min})\n\n`

      for (const unit of levelUnits) {
        const readings = unit.curriculum_readings || []
        const grammar = unit.curriculum_grammar?.[0]
        const writing = unit.curriculum_writing?.[0]
        const speaking = unit.curriculum_speaking?.[0]
        const listening = unit.curriculum_listening?.[0]
        const pronunciation = unit.curriculum_pronunciation?.[0]
        const assessment = unit.curriculum_assessments?.[0]
        const qCount = assessment?.questions ? (Array.isArray(assessment.questions) ? assessment.questions.length : 0) : 0
        const vc = vocabMap[unit.id]?.unique || 0

        md += `### Unit ${unit.unit_number}: ${unit.theme_en} / ${unit.theme_ar}\n\n`
        md += `| Section | Details |\n|---|---|\n`

        for (const r of readings) {
          md += `| Reading ${r.reading_label} | ${r.passage_word_count || 0} words |\n`
        }
        md += `| Vocabulary | ${vc} words |\n`
        md += `| Grammar | ${grammar?.topic_name_en || '—'} |\n`
        md += `| Writing | ${writing?.task_type || '—'} (${writing?.word_count_min || 0}-${writing?.word_count_max || 0} words) |\n`
        md += `| Speaking | ${speaking?.topic_type || '—'} (${speaking?.min_duration_seconds || 0}-${speaking?.max_duration_seconds || 0}s) |\n`
        md += `| Listening | ${listening?.audio_url ? 'Audio available' : 'No audio'} |\n`
        md += `| Pronunciation | ${pronunciation?.focus_type || '—'} |\n`
        md += `| Assessment | ${qCount} questions |\n`
        md += '\n'
      }
    }

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fluentia-curriculum-map-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm fl-btn-primary"
    >
      <Download size={14} />
      تصدير
    </button>
  )
}

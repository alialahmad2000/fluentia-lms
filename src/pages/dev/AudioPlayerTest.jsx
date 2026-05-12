import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import SmartAudioPlayer from '../../components/audio/SmartAudioPlayer'

const ALL_FEATURES = {
  karaoke: true, speedControl: true, skipButtons: true, sentenceNav: true,
  paragraphNav: true, sentenceMode: false, abLoop: true, bookmarks: true,
  speakerLabels: true, hideTranscript: true, keyboardShortcuts: true,
  mobileGestures: true, dictation: false, autoResume: true,
  playbackHistory: true, wordClickToLookup: true,
}

function FeatureToggle({ features, onChange }) {
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="font-semibold text-slate-400 mb-2 font-['Tajawal']">الميزات</p>
      <div className="space-y-1.5">
        {Object.entries(features).map(([k, v]) => (
          <label key={k} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={v} onChange={() => onChange(k)} className="accent-sky-500"/>
            <span className="text-slate-300 font-mono text-[11px]">{k}</span>
          </label>
        ))}
      </div>
      <details className="mt-3">
        <summary className="text-slate-500 cursor-pointer font-['Tajawal']">JSON</summary>
        <pre className="mt-1 text-[10px] text-slate-400 overflow-auto">{JSON.stringify(features, null, 2)}</pre>
      </details>
    </div>
  )
}

function StatusPanel({ label, data }) {
  return (
    <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="font-semibold text-slate-400 mb-2 font-['Tajawal']">{label}</p>
      <ul className="space-y-1">
        {Object.entries(data).map(([k, v]) => (
          <li key={k} className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-mono text-[11px]">{k}</span>
            <span className="text-slate-300 font-mono text-[11px]">{String(v ?? '—')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-slate-200 mb-4 font-['Tajawal']" dir="rtl">{title}</h2>
      {children}
    </section>
  )
}

// ── Section 1: Vocab (single audio) ──────────────────────────────────────────
function VocabSection({ userId }) {
  const [vocab, setVocab] = useState(null)
  const [features, setFeatures] = useState({ ...ALL_FEATURES, karaoke: false, sentenceNav: false, abLoop: false, paragraphNav: false })
  const [lastWord, setLastWord] = useState(null)

  useEffect(() => {
    let isMounted = true
    supabase.from('curriculum_vocabulary').select('id,word,audio_url').not('audio_url', 'is', null).limit(1).single()
      .then(({ data }) => { if (isMounted && data) setVocab(data) })
    return () => { isMounted = false }
  }, [])

  const toggleFeature = (k) => setFeatures(f => ({ ...f, [k]: !f[k] }))

  return (
    <Section title="اختبار 1: صوت مفرد (Vocab)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {vocab ? (
            <SmartAudioPlayer
              audioUrl={vocab.audio_url}
              text={vocab.word}
              contentId={vocab.id}
              contentType="vocab"
              studentId={userId}
              variant="compact"
              features={features}
              onWordClick={(w) => setLastWord(w)}
            />
          ) : (
            <div className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}/>
          )}
          {vocab && (
            <p className="mt-2 text-xs text-slate-500 font-['Tajawal']">
              الكلمة: <span className="text-slate-300 font-mono" dir="ltr">{vocab.word}</span>
            </p>
          )}
        </div>
        <div className="space-y-3">
          <FeatureToggle features={features} onChange={toggleFeature}/>
          <StatusPanel label="الحالة" data={{ 'last_word_clicked': lastWord, 'vocab_id': vocab?.id?.substring(0, 8) }}/>
        </div>
      </div>
    </Section>
  )
}

// ── Section 2: Reading (multi-paragraph) ─────────────────────────────────────
function ReadingSection({ userId }) {
  const [data, setData] = useState(null)
  const [features, setFeatures] = useState({ ...ALL_FEATURES })
  const [status, setStatus] = useState({})

  useEffect(() => {
    let isMounted = true
    async function load() {
      const { data: rpa } = await supabase
        .from('reading_passage_audio')
        .select('passage_id, full_audio_url, word_timestamps, paragraph_audio')
        .limit(1).single()
      if (!isMounted || !rpa) return

      const { data: passage } = await supabase
        .from('curriculum_readings')
        .select('id, title_en, passage_content')
        .eq('id', rpa.passage_id)
        .single()

      if (!isMounted) return
      // Build single segment from reading data
      const paragraphs = passage?.passage_content?.paragraphs || []
      const fullText = paragraphs.join('\n\n')
      const segment = [{
        audio_url: rpa.full_audio_url,
        duration_ms: 0,
        text_content: fullText,
        word_timestamps: rpa.word_timestamps || [],
        segment_index: 0,
        speaker_label: null,
        voice_id: null,
      }]
      setData({ passage, segment, rpa })
    }
    load()
    return () => { isMounted = false }
  }, [])

  const toggleFeature = (k) => setFeatures(f => ({ ...f, [k]: !f[k] }))

  return (
    <Section title="اختبار 2: قراءة متعددة الفقرات (Reading)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {data ? (
            <SmartAudioPlayer
              segments={data.segment}
              contentId={data.passage.id}
              contentType="reading"
              studentId={userId}
              features={features}
              onWordClick={(w, s, ms) => setStatus(p => ({ ...p, last_word: w, at_ms: ms }))}
              onSegmentComplete={(i) => setStatus(p => ({ ...p, segment_done: i }))}
            />
          ) : (
            <div className="h-40 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}/>
          )}
          {data && (
            <p className="mt-2 text-xs text-slate-500 font-['Tajawal']">
              العنوان: <span className="text-slate-300" dir="ltr">{data.passage.title_en}</span>
            </p>
          )}
        </div>
        <div className="space-y-3">
          <FeatureToggle features={features} onChange={toggleFeature}/>
          <StatusPanel label="الحالة" data={status}/>
        </div>
      </div>
    </Section>
  )
}

// ── Section 3: Listening (multi-speaker) ─────────────────────────────────────
function ListeningSection({ userId }) {
  const [data, setData] = useState(null)
  const [features, setFeatures] = useState({ ...ALL_FEATURES })
  const [status, setStatus] = useState({})

  useEffect(() => {
    let isMounted = true
    async function load() {
      // Find a transcript with multiple segments
      const { data: first } = await supabase
        .from('listening_audio')
        .select('transcript_id')
        .limit(1).single()
      if (!isMounted || !first) return

      const { data: segs } = await supabase
        .from('listening_audio')
        .select('*')
        .eq('transcript_id', first.transcript_id)
        .order('segment_index')

      const { data: transcript } = await supabase
        .from('curriculum_listening')
        .select('id, title_en, audio_type')
        .eq('id', first.transcript_id)
        .single()

      if (!isMounted) return
      const segments = (segs || []).map(s => ({
        audio_url: s.audio_url,
        duration_ms: s.duration_ms || 0,
        text_content: s.text_content,
        word_timestamps: s.word_timestamps || [],
        segment_index: s.segment_index,
        speaker_label: s.speaker_label,
        voice_id: s.voice_id,
      }))
      setData({ transcript, segments })
    }
    load()
    return () => { isMounted = false }
  }, [])

  const toggleFeature = (k) => setFeatures(f => ({ ...f, [k]: !f[k] }))

  return (
    <Section title="اختبار 3: استماع متعدد الأصوات (Listening)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {data ? (
            <SmartAudioPlayer
              segments={data.segments}
              contentId={data.transcript.id}
              contentType="listening"
              studentId={userId}
              features={features}
              onWordClick={(w, s) => setStatus(p => ({ ...p, last_word: w, seg: s }))}
              onSegmentComplete={(i) => setStatus(p => ({ ...p, seg_done: i, speaker: data.segments[i]?.speaker_label }))}
            />
          ) : (
            <div className="h-40 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}/>
          )}
          {data && (
            <p className="mt-2 text-xs text-slate-500 font-['Tajawal']">
              {data.transcript.title_en} — {data.segments.length} مقطع
            </p>
          )}
        </div>
        <div className="space-y-3">
          <FeatureToggle features={features} onChange={toggleFeature}/>
          <StatusPanel label="الحالة" data={status}/>
        </div>
      </div>
    </Section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AudioPlayerTest() {
  const profile = useAuthStore(s => s.profile)
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)

  // All hooks before conditional returns
  const userId = user?.id

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"/></div>
  if (!user || profile?.role !== 'admin') return <Navigate to="/" replace/>

  return (
    <div
      className="min-h-screen px-4 py-8 max-w-5xl mx-auto"
      style={{ color: 'var(--text-primary, #f1f1f1)' }}
    >
      <div className="mb-8" dir="rtl">
        <h1 className="text-2xl font-bold text-slate-100 font-['Tajawal']">اختبار مشغّل الصوت الذكي</h1>
        <p className="text-sm text-slate-500 mt-1 font-['Tajawal']">Foundation — يعمل ببيانات حقيقية من قاعدة البيانات</p>
      </div>

      <VocabSection userId={userId}/>
      <ReadingSection userId={userId}/>
      <ListeningSection userId={userId}/>
    </div>
  )
}

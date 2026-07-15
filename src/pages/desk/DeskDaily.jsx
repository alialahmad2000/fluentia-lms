// DeskDaily (Daily) — her daily hub: one place to see today's tasks pulled from each
// area she has — vocabulary, grammar, and a reading. Streak keeps her coming back.
// English-primary, Arabic kept as small glosses.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Flame, Sunrise, ArrowRight, Check, CheckCircle2, Layers, BookText, BookOpen, ChevronRight } from 'lucide-react'
import { useDailyProgress } from './useDailyProgress'
import { useReadingProgress } from './useReadingProgress'
import './desk.css'

export default function DeskDaily() {
  const rm = useReducedMotion()
  const { streak, todayCount, todayVocabDone, todayGrammarDone, grammarToday, vocab, grammar } = useDailyProgress()
  const { next: nextReading, done: readingDone, total: readingTotal } = useReadingProgress()
  const missionDone = todayVocabDone && todayGrammarDone

  return (
    <div className="space-y-7">
      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5"><Sunrise size={14} style={{ color: 'var(--brass)' }} /><span className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.22em]" dir="ltr" style={{ color: 'var(--brass)' }}>DAILY</span></div>
        <h1 className="font-['Hanken_Grotesk'] font-extrabold text-2xl lg:text-[32px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>Daily</h1>
        <p className="font-['Hanken_Grotesk'] text-[14px] mt-1.5 max-w-[560px] leading-relaxed" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.58)' }}>
          Five minutes a day — vocabulary and one grammar rule. What matters most is showing up every day; spaced repetition makes it stick.
        </p>
      </div>

      {/* streak hero */}
      <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1] }}
        className="desk-glass p-6 flex items-center gap-5" style={{ borderColor: 'rgba(239, 106, 67,0.22)' }}>
        <div className={`desk-flame ${streak > 0 ? 'lit' : ''}`}><Flame size={26} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-['Hanken_Grotesk'] font-extrabold text-2xl leading-none" dir="ltr" style={{ color: 'var(--cream)' }}>{streak} <span className="text-[15px] font-bold" style={{ color: 'rgba(240, 234, 224,0.68)' }}>{streak === 1 ? 'day streak' : 'day streak'}</span></p>
          <p className="font-['Hanken_Grotesk'] text-[13px] mt-1.5 leading-relaxed" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.65)' }}>
            {missionDone ? 'Today’s mission done — great work. Keep the streak alive tomorrow.' : streak > 0 ? 'Keep the streak going — finish today’s mission.' : 'Start your streak today.'}
          </p>
        </div>
      </motion.div>

      {/* today's mission */}
      <div className="desk-rise">
        <p className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.2em] mb-3" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.6)' }}>TODAY'S MISSION</p>
        <div className="space-y-3">
          {/* vocab */}
          <Link to="/desk/daily/vocab" className="group desk-glass flex items-center gap-4 p-5" style={{ borderColor: todayVocabDone ? undefined : 'rgba(239, 106, 67,0.22)' }}>
            <div className={`desk-mission-mark ${todayVocabDone ? 'done' : ''}`}>{todayVocabDone ? <Check size={20} strokeWidth={3} /> : <Layers size={20} />}</div>
            <div className="min-w-0 flex-1">
              <p className="font-['Hanken_Grotesk'] text-[12px] font-bold tracking-[0.06em] mb-0.5" dir="ltr" style={{ color: 'var(--brass)' }}>TODAY’S VOCABULARY</p>
              <h3 className="font-['Hanken_Grotesk'] font-extrabold text-[16px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>
                {todayVocabDone ? 'Today’s review done' : `${todayCount} ${todayCount === 1 ? 'word to review' : 'words to review'}`}
              </h3>
              <p className="font-['Hanken_Grotesk'] text-[12px] mt-0.5" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>Flashcards — I knew it or remind me</p>
            </div>
            {todayVocabDone ? <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: 'var(--brass-hi)' }} /> : <ArrowRight size={18} className="flex-shrink-0" style={{ color: 'var(--brass)' }} />}
          </Link>
          {/* grammar */}
          {grammarToday && (
            <Link to={`/desk/daily/grammar/${grammarToday.id}`} className="group desk-glass flex items-center gap-4 p-5" style={{ borderColor: todayGrammarDone ? undefined : 'rgba(239, 106, 67,0.22)' }}>
              <div className={`desk-mission-mark ${todayGrammarDone ? 'done' : ''}`}>{todayGrammarDone ? <Check size={20} strokeWidth={3} /> : <BookText size={20} />}</div>
              <div className="min-w-0 flex-1">
                <p className="font-['Hanken_Grotesk'] text-[12px] font-bold tracking-[0.06em] mb-0.5" dir="ltr" style={{ color: 'var(--brass)' }}>RULE OF THE DAY</p>
                <h3 className="font-['Hanken_Grotesk'] font-extrabold text-[16px] leading-tight truncate" dir="ltr" style={{ color: 'var(--cream)' }}>{grammarToday.en}</h3>
                <p className="font-['Tajawal'] text-[11.5px] mt-0.5 truncate" style={{ color: 'rgba(240, 234, 224,0.56)' }}>{grammarToday.ar}</p>
              </div>
              {todayGrammarDone ? <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: 'var(--brass-hi)' }} /> : <ArrowRight size={18} className="flex-shrink-0" style={{ color: 'var(--brass)' }} />}
            </Link>
          )}
          {/* reading */}
          {nextReading && (
            <Link to={`/desk/reading/${nextReading.id}`} className="group desk-glass flex items-center gap-4 p-5" style={{ borderColor: 'rgba(239, 106, 67,0.22)' }}>
              <div className="desk-mission-mark"><BookOpen size={20} /></div>
              <div className="min-w-0 flex-1">
                <p className="font-['Hanken_Grotesk'] text-[12px] font-bold tracking-[0.06em] mb-0.5" dir="ltr" style={{ color: 'var(--brass)' }}>TODAY’S READING</p>
                <h3 className="font-['Hanken_Grotesk'] font-extrabold text-[16px] leading-tight truncate" dir="ltr" style={{ color: 'var(--cream)' }}>{nextReading.title}</h3>
                <p className="font-['Hanken_Grotesk'] text-[11.5px] mt-0.5" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>{nextReading.level} · {nextReading.minutes} min · {nextReading.topic}</p>
              </div>
              <ArrowRight size={18} className="flex-shrink-0" style={{ color: 'var(--brass)' }} />
            </Link>
          )}
        </div>
      </div>

      {/* browse */}
      <div className="desk-rise">
        <p className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.2em] mb-3" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.6)' }}>EXPLORE</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/desk/daily/vocab" className="group desk-glass p-4 flex items-center gap-3">
            <div className="desk-mini-mark"><Layers size={16} /></div>
            <div className="min-w-0 flex-1"><p className="font-['Hanken_Grotesk'] font-bold text-[14px] whitespace-nowrap" dir="ltr" style={{ color: 'var(--cream)' }}>Word vault</p><p className="font-['Hanken_Grotesk'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>{vocab.total} words</p></div>
            <ChevronRight size={17} className="desk-lesson-chev" />
          </Link>
          <Link to="/desk/daily/grammar" className="group desk-glass p-4 flex items-center gap-3">
            <div className="desk-mini-mark"><BookText size={16} /></div>
            <div className="min-w-0 flex-1"><p className="font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--cream)' }}>Grammar bank</p><p className="font-['Hanken_Grotesk'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>{grammar.total} rules</p></div>
            <ChevronRight size={17} className="desk-lesson-chev" />
          </Link>
        </div>
        {/* reading — live */}
        <Link to="/desk/reading" className="group desk-glass p-4 flex items-center gap-3 mt-3">
          <div className="desk-mini-mark"><BookOpen size={16} /></div>
          <div className="min-w-0 flex-1"><p className="font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--cream)' }}>Reading in your field</p><p className="font-['Hanken_Grotesk'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>{readingTotal} IT passages{readingDone ? ` · ${readingDone} read` : ''}</p></div>
          <ChevronRight size={17} className="desk-lesson-chev" />
        </Link>
      </div>
    </div>
  )
}

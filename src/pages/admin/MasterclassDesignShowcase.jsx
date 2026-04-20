import { useState } from 'react'
import {
  NarrativeReveal,
  BandDisplay,
  ChapterTransition,
  TrainerPresence,
  JourneyTimeline,
  WeekReveal,
  ExamCountdown,
  ErrorLesson,
  StrategyModule,
  RecallPrompt,
} from '@/design-system/components/masterclass'

/* ─────────────────── Sample Data ─────────────────── */

const SAMPLE_WEEKS = Array.from({ length: 12 }, (_, i) => ({
  weekNumber: i + 1,
  title: ['التأسيس', 'القراءة', 'الاستماع', 'الكتابة', 'التحدث', 'المراجعة', 'المحاكاة', 'التحدي', 'الصقل', 'الثقة', 'الجاهزية', 'الاختبار'][i],
  status: i < 4 ? 'past' : i === 4 ? 'current' : i < 10 ? 'future' : 'locked',
  milestone: i === 3 ? 'First Mock' : i === 7 ? 'Mid Mock' : undefined,
  bandAtEnd: i < 4 ? [5.5, 5.5, 6.0, 6.5][i] : undefined,
}))

const SAMPLE_STRATEGY_SECTIONS = [
  {
    type: 'arabic_intro',
    title: 'ما هو نوع هذا السؤال؟',
    content: 'يطلب منك هذا السؤال مطابقة عناوين الفقرات مع الفقرات الصحيحة.\n\nهذا **النوع صعب** لأنه يتطلب فهم الفكرة الرئيسية لكل فقرة.\n- اقرأ العناوين أولاً\n- ابحث عن الفكرة الرئيسية\n- لا تقرأ كل كلمة',
    defaultOpen: true,
  },
  {
    type: 'strategic_approach',
    title: 'الاستراتيجية خطوة بخطوة',
    content: '**الخطوة 1:** اقرأ جميع العناوين في 30 ثانية\n**الخطوة 2:** اقرأ أول وآخر جملة في كل فقرة\n**الخطوة 3:** طابق العنوان مع الفكرة الرئيسية\n\n*تذكر: العناوين الإضافية موجودة لتضليلك.*',
    defaultOpen: true,
  },
  {
    type: 'common_traps',
    title: 'الأخطاء الشائعة',
    content: '- تفاصيل دقيقة لا تمثّل الفكرة الرئيسية\n- كلمة مشتركة بين العنوان والفقرة لكنها مضللة\n- **أكبر خطأ:** قراءة الفقرة بالكامل لكل عنوان',
    collapsible: true,
    defaultOpen: true,
  },
  {
    type: 'worked_example',
    title: 'مثال محلول',
    content: 'فقرة A:\n```\nThe development of renewable energy sources has accelerated\nin recent years. Solar panels, once prohibitively expensive,\nhave dropped in price by 90% since 2010.\n```\nالعنوان الصحيح: **The falling cost of clean energy**\n\nالسبب: الفكرة الرئيسية هي انخفاض التكلفة، ليس مجرد التطوير.',
    collapsible: true,
    defaultOpen: false,
  },
  {
    type: 'guided_practice_start',
    title: 'جاهز للتدريب؟',
    content: 'لديك **5 فقرات** و**7 عناوين**. الوقت المتاح: 8 دقائق.\n\nتذكر الاستراتيجية: عناوين أولاً، ثم الجملة الأولى والأخيرة.',
    defaultOpen: true,
  },
]

/* ─────────────────── Section wrapper ─────────────────── */

function Section({ title, children }) {
  return (
    <div style={{
      marginBottom: 'var(--space-9)',
      padding: 'var(--space-6)',
      background: 'var(--ds-surface-1)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--ds-border-subtle)',
    }}>
      <h2 style={{
        margin: '0 0 var(--space-5)',
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--ds-text-primary)',
        fontFamily: "'IBM Plex Sans', sans-serif",
        borderBottom: '1px solid var(--ds-border-subtle)',
        paddingBottom: 'var(--space-3)',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      {label && (
        <p style={{ margin: '0 0 var(--space-2)', fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
        {children}
      </div>
    </div>
  )
}

/* ─────────────────── Showcase ─────────────────── */

export default function MasterclassDesignShowcase() {
  const [showNarrative, setShowNarrative] = useState(false)
  const [showChapter, setShowChapter] = useState(false)
  const [weekRevealOpen, setWeekRevealOpen] = useState(false)
  const [recallAnswer, setRecallAnswer] = useState(null)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ds-bg-base)',
      padding: 'var(--space-6)',
      maxWidth: 900,
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: 'var(--space-7)' }}>
        <h1 style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--ds-text-primary)',
          fontFamily: "'Playfair Display', Georgia, serif",
        }}>
          Masterclass Design System
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Phase 0A — Visual inspection showcase · Admin only
        </p>
      </div>

      {/* 1. NarrativeReveal */}
      <Section title="1. NarrativeReveal">
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 13, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Progressive text reveal. Detects Arabic/English per line.
        </p>
        {showNarrative ? (
          <div style={{ background: 'var(--ds-reveal-bg)', borderRadius: 'var(--radius-md)', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <NarrativeReveal
              lines={['خذ نفس.', '', 'هذا الاختبار سيحدد نقطة انطلاقك.', 'Take a moment.', '', 'ليس امتحاناً — هو مرآة.']}
              delayBetweenLines={1600}
              pauseAfterLast={1000}
              onComplete={() => setShowNarrative(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowNarrative(true)}
            style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--ds-accent-primary)', color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
          >
            ▶ Play NarrativeReveal
          </button>
        )}
      </Section>

      {/* 2. BandDisplay */}
      <Section title="2. BandDisplay">
        <Row label="Sizes (xl, lg, md, sm)">
          <BandDisplay band={7.5} size="xl" label="هدفك" animate />
          <BandDisplay band={6.0} size="lg" label="الحالي" />
          <BandDisplay band={5.5} size="md" delta={+0.5} />
          <BandDisplay band={4.5} size="sm" delta={-0.5} />
        </Row>
        <Row label="Comparison variant">
          <BandDisplay band={6.0} comparisonBand={7.5} variant="comparison" size="lg" />
        </Row>
        <Row label="Null band">
          <BandDisplay band={null} size="md" label="لم يُحدد" />
        </Row>
      </Section>

      {/* 3. ChapterTransition */}
      <Section title="3. ChapterTransition">
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 13, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Fullscreen overlay. Auto-dismisses after 5s. Press ESC to skip.
        </p>
        <button
          onClick={() => setShowChapter(true)}
          style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--ds-accent-primary)', color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
        >
          ▶ Show ChapterTransition
        </button>
        {showChapter && (
          <ChapterTransition
            chapterNumber={2}
            chapterTitle="القراءة"
            totalChapters={4}
            duration={5000}
            onComplete={() => setShowChapter(false)}
          />
        )}
      </Section>

      {/* 4. TrainerPresence */}
      <Section title="4. TrainerPresence">
        <Row label="Sizes + states">
          <TrainerPresence trainerName="د. علي" size="sm" />
          <TrainerPresence trainerName="د. علي" size="md" hasUnread lastSeenMinutesAgo={2} onClick={() => {}} />
          <TrainerPresence trainerName="د. علي" size="lg" hasUnread />
          <TrainerPresence trainerName="Dr. Sarah" size="md" lastSeenMinutesAgo={5} avatarUrl="https://i.pravatar.cc/64?img=47" onClick={() => {}} />
        </Row>
        <Row label="Floating position (bottom-left of viewport)">
          <TrainerPresence trainerName="د. علي" size="md" hasUnread position="floating" onClick={() => {}} />
          <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>← fixed bottom-left</span>
        </Row>
      </Section>

      {/* 5. JourneyTimeline */}
      <Section title="5. JourneyTimeline">
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 13, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          12-week arc. Horizontal on desktop, vertical on mobile. Milestone weeks have gold ring.
        </p>
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <p style={{ margin: '0 0 var(--space-2)', fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>Horizontal</p>
          <JourneyTimeline currentWeek={5} weeks={SAMPLE_WEEKS} onWeekClick={(w) => alert(`Week ${w}`)} orientation="horizontal" />
        </div>
        <div>
          <p style={{ margin: '0 0 var(--space-2)', fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>Vertical</p>
          <JourneyTimeline currentWeek={5} weeks={SAMPLE_WEEKS.slice(0, 6)} onWeekClick={(w) => alert(`Week ${w}`)} orientation="vertical" />
        </div>
      </Section>

      {/* 6. WeekReveal */}
      <Section title="6. WeekReveal">
        <p style={{ margin: '0 0 var(--space-4)', fontSize: 13, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Sunday unlock modal. Focus-trapped. ESC / backdrop to dismiss.
        </p>
        <button
          onClick={() => setWeekRevealOpen(true)}
          style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--ds-accent-primary)', color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}
        >
          ▶ Show WeekReveal
        </button>
        <WeekReveal
          open={weekRevealOpen}
          weekNumber={6}
          title="الأسبوع 6: التحدي"
          description="هذا الأسبوع هو نقطة تحوّل في رحلتك. ستواجه أسئلة أصعب، وستكتشف قدرات لم تعرفها من قبل. الصعوبة هي الطريق."
          goals={['إتمام جلستين كتابة على الأقل', 'مراجعة بنك الأخطاء يومياً', 'محاكاة قراءة كاملة تحت ضغط الوقت']}
          onDismiss={() => setWeekRevealOpen(false)}
        />
      </Section>

      {/* 7. ExamCountdown */}
      <Section title="7. ExamCountdown">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ flex: 1, minWidth: 280, background: 'var(--ds-surface-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <p style={{ margin: 'var(--space-3)', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif' " }}>14 days out</p>
            <ExamCountdown examDate={new Date(Date.now() + 14 * 86400000).toISOString()} studentName="أحمد" examType="academic" onStartReadinessMode={() => {}} />
          </div>
          <div style={{ flex: 1, minWidth: 280, background: 'var(--ds-surface-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <p style={{ margin: 'var(--space-3)', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif' " }}>1 day out</p>
            <ExamCountdown examDate={new Date(Date.now() + 86400000).toISOString()} studentName="أحمد" examType="general_training" />
          </div>
          <div style={{ flex: 1, minWidth: 280, background: 'var(--ds-surface-2)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <p style={{ margin: 'var(--space-3)', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif' " }}>Day-of</p>
            <ExamCountdown examDate={new Date(Date.now() + 3600000).toISOString()} studentName="أحمد" examType="academic" />
          </div>
        </div>
      </Section>

      {/* 8. ErrorLesson */}
      <Section title="8. ErrorLesson">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 640 }}>
          <ErrorLesson
            errorId="e1"
            questionText="The author suggests that renewable energy development is primarily driven by ___."
            studentAnswer="government subsidies"
            correctAnswer="falling technology costs"
            errorType="comprehension"
            lessonAr="اقرأ الجملة التي تحتوي على الكلمة المطلوبة مرتين — المرة الأولى للمعنى، والثانية للتأكيد."
            timesSeen={3}
            timesCorrect={1}
            onTryAgain={() => {}}
            onArchive={() => {}}
          />
          <ErrorLesson
            errorId="e2"
            questionText="Choose the correct option: The meeting was postponed ___ bad weather."
            studentAnswer="because"
            correctAnswer="due to"
            errorType="language"
            lessonAr="بعد الفعل نستخدم 'because' أما بعد الاسم أو الاسمية فنستخدم 'due to'."
            timesSeen={5}
            timesCorrect={4}
            onTryAgain={() => {}}
          />
        </div>
      </Section>

      {/* 9. StrategyModule */}
      <Section title="9. StrategyModule">
        <StrategyModule
          moduleId="matching-headings"
          questionType="Matching Headings"
          sections={SAMPLE_STRATEGY_SECTIONS}
          onStartPractice={() => alert('Starting practice...')}
          readingProgress={undefined}
        />
      </Section>

      {/* 10. RecallPrompt */}
      <Section title="10. RecallPrompt">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div>
            <p style={{ margin: '0 0 var(--space-3)', fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>Text mode (with 60s timer)</p>
            {recallAnswer ? (
              <p style={{ fontSize: 14, color: 'var(--ds-accent-success)', fontFamily: "'Tajawal', sans-serif" }}>
                ✓ تم الإرسال: "{typeof recallAnswer === 'string' ? recallAnswer.slice(0, 50) : '[صوت]'}..."
              </p>
            ) : (
              <RecallPrompt
                promptText="ما الفرق بين 'due to' و 'because of'؟ أعطِ مثالاً على كل منهما."
                acceptText
                acceptVoice
                timeLimit={60}
                onSubmit={(ans, mode) => setRecallAnswer(ans)}
                onSkip={() => setRecallAnswer('skipped')}
              />
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}

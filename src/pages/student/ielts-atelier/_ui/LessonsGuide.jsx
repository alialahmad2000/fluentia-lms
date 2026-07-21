import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { LabHeader } from './primitives'
import { ReadingDrawer, DrawerLede, DrawerSteps, DrawerExample, DrawerCallout } from './ReadingDrawer'

// Shared teach-first lessons surface: a grid of lesson cards → the bento lesson
// modal (ReadingDrawer). Reading has its own inline copy; speaking + listening
// reuse this with their own lesson data.

const SANS = "'Tajawal', sans-serif"

function LessonCard({ lesson, onOpen }) {
  const I = lesson.icon
  return (
    <button type="button" onClick={() => onOpen(lesson)} className="iel-gcard" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', width: '100%', cursor: 'pointer',
      textAlign: 'start', background: 'var(--iel-surface)', fontFamily: SANS,
    }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
        {I && <I size={18} />}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.3 }}>{lesson.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.subtitle}</div>
      </div>
      <span style={{ color: 'var(--iel-ink-3)', flex: 'none', fontSize: 15 }}>←</span>
    </button>
  )
}

export default function LessonsGuide({ eyebrow, title, intro, kicker = 'درس', lessons = [] }) {
  const [open, setOpen] = useState(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow={eyebrow} title={title}>{intro}</LabHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 12 }}>
        {lessons.map((l) => <LessonCard key={l.id} lesson={l} onOpen={setOpen} />)}
      </div>
      <ReadingDrawer open={!!open} onClose={() => setOpen(null)} icon={open?.icon} color={open?.color} kicker={kicker} title={open?.title} subtitle={open?.subtitle}>
        {open && (
          <>
            <DrawerLede>{open.concept}</DrawerLede>
            <DrawerSteps title="الخطوات" steps={open.steps} color={open.color} span={open.example ? 1 : 2} />
            {open.example && (
              <DrawerExample title="مثال" span={1}>
                <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.7, color: 'var(--iel-ink)', direction: 'ltr', textAlign: 'left', fontFamily: SANS }}>{open.example.text_en}</p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--iel-ink-3)' }}>{open.example.why_ar}</p>
              </DrawerExample>
            )}
            <DrawerCallout icon={Lightbulb} tone="gold" title="نصيحة" span={2}>{open.tip}</DrawerCallout>
          </>
        )}
      </ReadingDrawer>
    </div>
  )
}

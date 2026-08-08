/**
 * Shared pieces of «القاعة». Everything styles through --hall-* tokens
 * (see hall.css) so no screen carries its own palette.
 */

export function Atmosphere() {
  return (
    <div className="hall-atmo" aria-hidden="true">
      <div className="beam" />
      <div className="halo" />
      <div className="ember" />
      <div className="floor" />
      <div className="grain" />
    </div>
  )
}

/** The instrument ring: the score as a calibrated dial with the target marked. */
export function ScoreRing({ score, target, size = 340, label = 'من 100' }) {
  const R = 132
  const CIRC = 2 * Math.PI * R                       // 829.4
  const pct = Math.max(0, Math.min(100, Number(score) || 0))
  const offset = CIRC * (1 - pct / 100)

  // The target is the premise of the screen, so it gets a real radial tick that
  // crosses the track — an earlier 3px dash on an 829px circumference was a
  // sub-pixel smudge and the text label was doing all the work.
  const tRad = target != null ? ((-90 + 3.6 * Number(target)) * Math.PI) / 180 : null
  const tick = tRad == null ? null : {
    x1: 190 + 118 * Math.cos(tRad), y1: 190 + 118 * Math.sin(tRad),
    x2: 190 + 148 * Math.cos(tRad), y2: 190 + 148 * Math.sin(tRad),
    dx: 190 + R * Math.cos(tRad), dy: 190 + R * Math.sin(tRad),
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: size, aspectRatio: '1', marginInline: 'auto' }}>
      {/* On paper the ring is an instrument dial drawn in ink: a solid arc and
          real tick marks. The gold gradient + glow it used to carry only read
          as "premium" against an obsidian ground; here it would look muddy. */}
      <svg viewBox="0 0 380 380" fill="none" style={{ width: '100%', display: 'block' }}>
        <circle cx="190" cy="190" r="168" stroke="var(--hall-line)" strokeWidth="1" />
        <g stroke="var(--hall-line)" strokeWidth="1.5">
          <line x1="190" y1="18" x2="190" y2="32" /><line x1="362" y1="190" x2="348" y2="190" />
          <line x1="190" y1="362" x2="190" y2="348" /><line x1="18" y1="190" x2="32" y2="190" />
          <line x1="311" y1="69" x2="302" y2="78" /><line x1="311" y1="311" x2="302" y2="302" />
          <line x1="69" y1="311" x2="78" y2="302" /><line x1="69" y1="69" x2="78" y2="78" />
        </g>
        <circle cx="190" cy="190" r={R} stroke="#EAE6DE" strokeWidth="12" />
        <circle
          cx="190" cy="190" r={R} stroke="var(--hall-gold)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          transform="rotate(-90 190 190)"
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)' }}
        />
        {tick && (
          <g>
            <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2}
              stroke="var(--hall-rose)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={tick.dx} cy={tick.dy} r="3.5" fill="var(--hall-rose)" />
          </g>
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{
            fontFamily: 'var(--hall-sans)', fontWeight: 600, fontSize: 'clamp(52px,12vw,88px)',
            lineHeight: 0.95, letterSpacing: '-0.02em', color: 'var(--hall-ink)',
            fontVariantNumeric: 'tabular-nums',
          }}>{score ?? '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--hall-ink-3)', marginBlockStart: 10 }}>
            {label}
          </div>
          {/* Matches the tick's colour so the label and the mark it explains
              are visibly the same fact. */}
          {target != null && (
            <div style={{ fontSize: 12.5, color: 'var(--hall-rose)', marginBlockStart: 12, fontWeight: 600 }}>
              الهدف {target}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Page-level loading is a SKELETON, never a spinner (house rule): it holds the
 * shape the content will take, so the layout does not jump when data lands.
 * A spinner is still correct INSIDE a button, where it reports one action's
 * progress rather than a whole screen's.
 */
export function Spinner() {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        جاري التحميل
      </span>
      <div className="hall-core" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,360px) 1fr', gap: 48, alignItems: 'center',
      }}>
        <div className="hall-shimmer" style={{ aspectRatio: '1', maxWidth: 340, borderRadius: '50%', marginInline: 'auto' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="hall-shimmer" style={{ height: 26, width: 160, borderRadius: 99 }} />
          <div className="hall-shimmer" style={{ height: 44, width: '86%', borderRadius: 12 }} />
          <div className="hall-shimmer" style={{ height: 44, width: '62%', borderRadius: 12 }} />
          <div className="hall-shimmer" style={{ height: 58, width: 260, borderRadius: 14, marginBlockStart: 12 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="hall-shimmer" style={{ height: 190, borderRadius: 20 }} />
        ))}
      </div>
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="hall-panel hall-empty">
      <h3>{title}</h3>
      <p>{children}</p>
      {action ? <div style={{ marginBlockStart: 22 }}>{action}</div> : null}
    </div>
  )
}

/** Arabic agrees the noun with the count, so "5 سؤال" is wrong.
 *  1 → singular · 2 → dual · 3-10 → plural · 11-99 → accusative ·
 *  exact hundreds → genitive. */
export function questionsAr(n) {
  if (!n) return 'لا أسئلة'
  if (n === 1) return 'سؤال واحد'
  if (n === 2) return 'سؤالان'
  if (n >= 3 && n <= 10) return `${n} أسئلة`
  if (n % 100 === 0) return `${n} سؤال`
  return `${n} سؤالًا`
}
export function questionUnitAr(n) {
  if (!n) return 'أسئلة'
  if (n === 2) return 'سؤالان'   // dual: the numeral must be suppressed by the caller
  if (n <= 1) return 'سؤال'
  if (n >= 3 && n <= 10) return 'أسئلة'
  if (n % 100 === 0) return 'سؤال'
  return 'سؤالًا'
}
export function lessonsAr(n) {
  if (!n) return 'لا دروس'
  if (n === 1) return 'درس واحد'
  if (n === 2) return 'درسان'
  if (n >= 3 && n <= 10) return `${n} دروس`
  if (n % 100 === 0) return `${n} درس`
  return `${n} درسًا`
}
export function topicsAr(n) {
  if (!n) return 'لا أبواب'
  if (n === 1) return 'باب واحد'
  if (n === 2) return 'بابان'
  if (n >= 3 && n <= 10) return `${n} أبواب`
  if (n % 100 === 0) return `${n} باب`
  return `${n} بابًا`
}
export function papersAr(n) {
  if (n === 0) return 'ما يكفي بعد لنموذج كامل'
  if (n === 1) return 'يكفي لنموذج واحد'
  if (n === 2) return 'يكفي لنموذجين'
  if (n <= 10) return `يكفي لـ${n} نماذج`
  if (n % 100 === 0) return `يكفي لـ${n} نموذج`
  return `يكفي لـ${n} نموذجًا`
}

/** Grades. Same ladder as questionsAr. */
export function degreesAr(n) {
  if (!n) return 'لا درجات'
  if (n === 1) return 'درجة واحدة'
  if (n === 2) return 'درجتان'
  if (n >= 3 && n <= 10) return `${n} درجات`
  if (n % 100 === 0) return `${n} درجة`
  return `${n} درجةً`
}

/** Papers as a standalone count — papersAr() is only the «يكفي لـ» phrasing. */
export function papersCountAr(n) {
  if (!n) return 'لا نماذج'
  if (n === 1) return 'نموذج واحد'
  if (n === 2) return 'نموذجان'
  if (n >= 3 && n <= 10) return `${n} نماذج`
  if (n % 100 === 0) return `${n} نموذج`
  return `${n} نموذجًا`
}

export function attemptsAr(n) {
  if (!n) return 'لا محاولات'
  if (n === 1) return 'محاولة واحدة'
  if (n === 2) return 'محاولتان'
  if (n >= 3 && n <= 10) return `${n} محاولات`
  if (n % 100 === 0) return `${n} محاولة`
  return `${n} محاولةً`
}

/** Lives here, not in STEPExam, so «أخطائي» can use it too. */
export function timesAr(n) {
  if (!n) return 'لا مرات'
  if (n % 100 !== 0 && n > 10) return `${n} مرةً`
  if (n === 1) return 'مرة'
  if (n === 2) return 'مرتين'
  if (n >= 3 && n <= 10) return `${n} مرات`
  return `${n} مرة`
}

export const SECTION_LABEL = {
  listening: 'فهم المسموع',
  reading: 'استيعاب المقروء',
  structure: 'التراكيب والتحليل الكتابي',
}

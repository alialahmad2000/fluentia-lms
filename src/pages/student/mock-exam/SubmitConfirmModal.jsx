import { AlertTriangle, AlertCircle, ArrowLeft, Check, Clock, MessageCircle, RotateCw, Send, X } from 'lucide-react'
import { useG } from '@/i18n/gender'

/**
 * SubmitConfirmModal
 *
 * Smart modal that opens when the student clicks "تسليم الاختبار".
 * Always opens — the bottom-bar submit button is never disabled. The modal
 * surfaces incomplete state with actionable jump-to buttons, but the student
 * can always override and submit anyway. This is a MOCK exam — locking
 * students out punishes learning.
 *
 * Props:
 *   open                   boolean
 *   onClose()              close the modal (back to exam)
 *   onConfirm()            actually submits via RPC (also serves as the retry handler)
 *   onJumpTo(i)            jump to question index i (and close the modal)
 *   issues                 computed array; each: { type, severity, title, detail, jumpToIndex?, jumpLabel? }
 *   submitting             boolean — show spinner in confirm button + disable both buttons
 *   submitError            string|null — inline error if last submit attempt failed
 *   whatsappInstructorUrl  string — direct link surfaced on submit error
 */
export default function SubmitConfirmModal({
  open, onClose, onConfirm, onJumpTo, issues = [], submitting, submitError,
  whatsappInstructorUrl = 'https://wa.me/966558669974',
}) {
  const g = useG()
  if (!open) return null

  const hasIssues = issues.length > 0
  const hasCritical = issues.some((i) => i.severity === 'critical')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="max-w-lg w-full p-6 rounded-2xl space-y-4"
        style={{
          background: 'var(--ds-bg-elevated, #11131c)',
          border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.10))',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <h2 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          تسليم الاختبار
        </h2>

        {hasIssues ? (
          <>
            <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
              قبل التسليم — لاحظنا الآتي:
            </p>
            <ul className="space-y-3">
              {issues.map((iss, i) => (
                <IssueRow
                  key={i}
                  issue={iss}
                  onJump={() => onJumpTo?.(iss.jumpToIndex)}
                />
              ))}
            </ul>
            <p
              className="text-xs leading-relaxed p-3 rounded-lg"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: 'var(--ds-text-secondary)',
              }}
            >
              {g('إذا أردت التسليم رغم هذه الملاحظات، اضغط «تسليم على أي حال».', 'إذا أردتِ التسليم رغم هذه الملاحظات، اضغطي «تسليم على أي حال».')}
              التسليم نهائي ولا يمكن التراجع — محاولة واحدة فقط.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--ds-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <ArrowLeft size={14} />
                الرجوع لإكمال الإجابات
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                style={{
                  background: hasCritical ? 'var(--ds-accent-warning, #f59e0b)' : 'var(--ds-accent-success, #22c55e)',
                  color: '#0a0d14',
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting
                  ? <Clock size={14} className="animate-spin" />
                  : <Send size={14} />}
                {submitting
                  ? g('جاري التسليم — إجاباتك محفوظة، لا تغلق الصفحة...', 'جاري التسليم — إجاباتكِ محفوظة، لا تغلقي الصفحة...')
                  : 'تسليم على أي حال'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ds-text-secondary)' }}>
              {g('أجبت على جميع الأسئلة وكتبت ما يكفي ✓', 'أجبتِ على جميع الأسئلة وكتبتِ ما يكفي ✓')}
            </p>
            <p
              className="text-xs leading-relaxed p-3 rounded-lg"
              style={{
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.25)',
                color: 'var(--ds-text-secondary)',
              }}
            >
              {g('تأكد قبل التسليم — التسليم نهائي ومحاولة واحدة فقط.', 'تأكدي قبل التسليم — التسليم نهائي ومحاولة واحدة فقط.')}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--ds-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <X size={14} />
                الرجوع للمراجعة
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                style={{
                  background: 'var(--ds-accent-success, #22c55e)',
                  color: '#0a0d14',
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting
                  ? <Clock size={14} className="animate-spin" />
                  : <Check size={14} />}
                {submitting
                  ? g('جاري التسليم — إجاباتك محفوظة، لا تغلق الصفحة...', 'جاري التسليم — إجاباتكِ محفوظة، لا تغلقي الصفحة...')
                  : g('نعم، أرسل الاختبار', 'نعم، أرسلي الاختبار')}
              </button>
            </div>
          </>
        )}

        {submitError && (
          <div
            className="p-3 rounded-lg text-xs space-y-3"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.30)',
              color: '#fca5a5',
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span className="leading-relaxed">{submitError}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5"
                style={{
                  background: 'rgba(34,197,94,0.18)',
                  color: '#86efac',
                  border: '1px solid rgba(34,197,94,0.40)',
                  opacity: submitting ? 0.5 : 1,
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                <RotateCw size={12} className={submitting ? 'animate-spin' : ''} />
                إعادة المحاولة
              </button>
              <a
                href={whatsappInstructorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5"
                style={{
                  background: 'rgba(56,189,248,0.12)',
                  color: 'var(--ds-accent-info, #38bdf8)',
                  border: '1px solid rgba(56,189,248,0.30)',
                }}
              >
                <MessageCircle size={12} />
                تواصل مع المدرب على واتساب
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function IssueRow({ issue, onJump }) {
  const isCritical = issue.severity === 'critical'
  return (
    <li
      className="p-3 rounded-lg space-y-2"
      style={{
        background: isCritical ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
        border: isCritical ? '1px solid rgba(239,68,68,0.30)' : '1px solid rgba(245,158,11,0.30)',
      }}
    >
      <div className="flex items-start gap-2">
        {isCritical
          ? <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: '#fca5a5' }} />
          : <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#fcd34d' }} />}
        <div className="flex-1 space-y-0.5">
          <div className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
            {issue.title}
          </div>
          {issue.detail && (
            <div className="text-xs leading-relaxed" style={{ color: 'var(--ds-text-secondary)' }}>
              {issue.detail}
            </div>
          )}
        </div>
      </div>
      {Number.isFinite(issue.jumpToIndex) && (
        <button
          type="button"
          onClick={onJump}
          className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5"
          style={{
            background: 'rgba(56,189,248,0.10)',
            color: 'var(--ds-accent-info, #38bdf8)',
            border: '1px solid rgba(56,189,248,0.25)',
          }}
        >
          <ArrowLeft size={12} />
          {issue.jumpLabel || 'الذهاب إلى السؤال'}
        </button>
      )}
    </li>
  )
}

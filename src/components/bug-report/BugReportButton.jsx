import { useState } from 'react'
import { Bug } from 'lucide-react'
import BugReportModal from './BugReportModal'

// Always-reachable "report a problem" launcher. Bottom-right so it never collides
// with the accessibility button (bottom-left) or the mobile bottom bar.
export default function BugReportButton() {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <>
      <div
        className="fixed z-[997]"
        style={{
          right: 16,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
        }}
      >
        {hover && (
          <div
            className="absolute whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-md pointer-events-none"
            style={{
              bottom: '100%', right: 0, marginBottom: 6,
              background: 'var(--surface-overlay, #1f2937)',
              color: 'var(--text-primary, #ffffff)',
              border: '1px solid var(--border-default, #374151)',
              boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))',
              fontFamily: "'Tajawal',sans-serif",
            }}
          >
            أبلغ عن مشكلة
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label="أبلغ عن مشكلة"
          className="w-11 h-11 rounded-full flex items-center justify-center select-none active:scale-95 transition-transform"
          style={{
            background: 'var(--surface-raised, #11131c)',
            color: '#38bdf8',
            boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
            border: '1.5px solid rgba(56,189,248,0.45)',
          }}
        >
          <Bug size={18} strokeWidth={2.1} />
        </button>
      </div>

      <BugReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

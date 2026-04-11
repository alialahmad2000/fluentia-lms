import { useState } from 'react';
import { Accessibility } from 'lucide-react';
import AccessibilityPanel from './AccessibilityPanel';

export default function A11yFloatingButton() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <>
      <div
        className="fixed z-[998]"
        style={{
          bottom: 'calc(var(--bottom-nav-height, 64px) + var(--sab, 0px) + 24px)',
          left: 24,
        }}
      >
        {/* Tooltip */}
        {hover && (
          <div
            className="absolute whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-lg pointer-events-none"
            style={{
              bottom: '100%',
              left: 0,
              marginBottom: 8,
              background: 'var(--surface-overlay, #1f2937)',
              color: 'var(--text-primary, #ffffff)',
              border: '1px solid var(--border-default, #374151)',
              boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))',
            }}
          >
            سهولة الوصول
          </div>
        )}
        <button
          onClick={() => setOpen(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label="إعدادات إمكانية الوصول"
          className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{
            background: 'var(--accent-sky, #0284c7)',
            color: '#ffffff',
            boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(2,132,199,0.4))',
            border: '2px solid rgba(255,255,255,0.2)',
          }}
        >
          <Accessibility size={26} strokeWidth={2} />
        </button>
      </div>

      <AccessibilityPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

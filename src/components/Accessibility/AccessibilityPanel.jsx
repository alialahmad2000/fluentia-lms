import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Type, ZoomIn, ZoomOut, Contrast, BookOpen, Zap, AlignJustify, MousePointer, Ear, Keyboard } from 'lucide-react';
import { useA11y } from '../../contexts/AccessibilityContext';

const FONT_SIZES = [
  { key: 'sm',  label: 'ص',    name: 'صغير' },
  { key: 'md',  label: 'م',    name: 'متوسط' },
  { key: 'lg',  label: 'ك',    name: 'كبير' },
  { key: 'xl',  label: 'كبير',  name: 'أكبر' },
  { key: '2xl', label: 'ضخم',  name: 'ضخم' },
];

const LINE_SPACINGS = [
  { key: 'tight',   label: 'ضيق' },
  { key: 'normal',  label: 'عادي' },
  { key: 'relaxed', label: 'مريح' },
  { key: 'loose',   label: 'واسع' },
];

const CURSOR_SIZES = [
  { key: 'normal', label: 'عادي' },
  { key: 'large',  label: 'كبير' },
  { key: 'xlarge', label: 'ضخم' },
];

export default function AccessibilityPanel({ open, onClose }) {
  const { settings, update, reset } = useA11y();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999]"
            style={{ background: 'var(--modal-backdrop, rgba(0,0,0,0.55))' }}
            onClick={onClose}
          />
          {/* Panel — slides from left (RTL) */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="إعدادات إمكانية الوصول"
            className="fixed top-0 left-0 bottom-0 z-[1000] overflow-y-auto"
            style={{
              width: 'min(420px, 100vw)',
              background: 'var(--surface-base, #ffffff)',
              borderRight: '1px solid var(--border-default, #e5e7eb)',
              boxShadow: 'var(--shadow-xl, 0 20px 50px rgba(0,0,0,0.25))',
              color: 'var(--text-primary)',
              direction: 'rtl',
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
              style={{
                background: 'var(--surface-raised, #ffffff)',
                borderBottom: '1px solid var(--border-subtle, #e5e7eb)',
              }}
            >
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                إمكانية الوصول
              </h2>
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* 1. Font Size */}
              <Section icon={Type} title="حجم الخط">
                <div className="grid grid-cols-5 gap-2">
                  {FONT_SIZES.map(f => (
                    <PillButton
                      key={f.key}
                      active={settings.fontSize === f.key}
                      onClick={() => update('fontSize', f.key)}
                      aria-label={f.name}
                    >
                      {f.label}
                    </PillButton>
                  ))}
                </div>
                <p className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  معاينة: هذا النص يعكس حجم الخط المختار
                </p>
              </Section>

              {/* 2. Zoom */}
              <Section icon={ZoomIn} title="تكبير الصفحة">
                <div className="flex items-center gap-2 mb-3">
                  <IconButton onClick={() => update('zoom', Math.max(75, settings.zoom - 25))} aria-label="تصغير">
                    <ZoomOut size={16} />
                  </IconButton>
                  <button
                    onClick={() => update('zoom', 100)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: 'var(--surface-overlay, #f3f4f6)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {settings.zoom}%
                  </button>
                  <IconButton onClick={() => update('zoom', Math.min(200, settings.zoom + 25))} aria-label="تكبير">
                    <ZoomIn size={16} />
                  </IconButton>
                </div>
                <input
                  type="range"
                  min="75"
                  max="200"
                  step="25"
                  value={settings.zoom}
                  onChange={(e) => update('zoom', parseInt(e.target.value, 10))}
                  aria-label="شريط تكبير الصفحة"
                  className="w-full"
                />
              </Section>

              {/* 3. High Contrast */}
              <Section icon={Contrast} title="التباين العالي">
                <Toggle
                  checked={settings.highContrast}
                  onChange={(v) => update('highContrast', v)}
                  label="تفعيل التباين العالي"
                />
              </Section>

              {/* 4. Dyslexia Font */}
              <Section icon={BookOpen} title="خط عُسر القراءة">
                <Toggle
                  checked={settings.dyslexiaFont}
                  onChange={(v) => update('dyslexiaFont', v)}
                  label="استخدام خط OpenDyslexic"
                />
              </Section>

              {/* 5. Reduce Motion */}
              <Section icon={Zap} title="تقليل الحركات">
                <Toggle
                  checked={settings.reduceMotion}
                  onChange={(v) => update('reduceMotion', v)}
                  label="إيقاف الانيميشنز والتأثيرات"
                />
              </Section>

              {/* 6. Line Spacing */}
              <Section icon={AlignJustify} title="تباعد الأسطر">
                <div className="grid grid-cols-4 gap-2">
                  {LINE_SPACINGS.map(s => (
                    <PillButton
                      key={s.key}
                      active={settings.lineSpacing === s.key}
                      onClick={() => update('lineSpacing', s.key)}
                    >
                      {s.label}
                    </PillButton>
                  ))}
                </div>
              </Section>

              {/* 7. Cursor Size */}
              <Section icon={MousePointer} title="حجم المؤشر">
                <div className="grid grid-cols-3 gap-2">
                  {CURSOR_SIZES.map(c => (
                    <PillButton
                      key={c.key}
                      active={settings.cursorSize === c.key}
                      onClick={() => update('cursorSize', c.key)}
                    >
                      {c.label}
                    </PillButton>
                  ))}
                </div>
              </Section>

              {/* 8. Screen Reader Mode */}
              <Section icon={Ear} title="وضع قارئ الشاشة">
                <Toggle
                  checked={settings.screenReaderMode}
                  onChange={(v) => update('screenReaderMode', v)}
                  label="تحسين للقارئات الصوتية"
                />
              </Section>

              {/* 9. Keyboard Nav */}
              <Section icon={Keyboard} title="التنقل بلوحة المفاتيح">
                <Toggle
                  checked={settings.keyboardNav}
                  onChange={(v) => update('keyboardNav', v)}
                  label="إظهار مؤشرات التركيز"
                />
              </Section>

              {/* Reset */}
              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors mt-4"
                style={{
                  background: 'var(--surface-overlay, #f3f4f6)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <RotateCcw size={16} />
                استعادة الإعدادات الافتراضية
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Sub-components ─── */

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={16} style={{ color: 'var(--accent-sky, #0284c7)' }} />}
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PillButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      className="py-2 rounded-lg text-sm font-semibold transition-all"
      style={{
        background: active ? 'var(--accent-sky, #0284c7)' : 'var(--surface-overlay, #f3f4f6)',
        color: active ? '#ffffff' : 'var(--text-primary)',
        border: `1px solid ${active ? 'var(--accent-sky, #0284c7)' : 'var(--border-subtle)'}`,
      }}
    >
      {children}
    </button>
  );
}

function IconButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
      style={{
        background: 'var(--surface-overlay, #f3f4f6)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{
          background: checked ? 'var(--accent-sky, #0284c7)' : 'var(--border-default, #d1d5db)',
        }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(-22px)' : 'translateX(-4px)' }}
        />
      </button>
    </label>
  );
}

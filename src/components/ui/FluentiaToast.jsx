import { useEffect } from 'react';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Toast store (Zustand)
// ---------------------------------------------------------------------------
let toastId = 0;

const useToastStore = create((set, get) => ({
  toasts: [],

  add(toast) {
    const id = ++toastId;
    const entry = { id, ...toast, createdAt: Date.now() };

    set((state) => {
      const next = [entry, ...state.toasts];
      // keep max 4
      return { toasts: next.slice(0, 4) };
    });

    // auto-dismiss after 4s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);

    return id;
  },

  remove(id) {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// ---------------------------------------------------------------------------
// Public helper — callable from anywhere
// ---------------------------------------------------------------------------
export function toast({ type = 'success', title, description }) {
  return useToastStore.getState().add({ type, title, description });
}

// ---------------------------------------------------------------------------
// Theme map
// ---------------------------------------------------------------------------
const THEMES = {
  xp: { color: 'var(--accent-sky, #0ea5e9)', icon: '\u2728' },
  streak: { color: '#f59e0b', icon: '\uD83D\uDD25' },
  achievement: { color: 'var(--accent-violet, #8b5cf6)', icon: '\uD83C\uDFC6' },
  error: { color: '#ef4444', icon: '\u274C' },
  success: { color: '#10b981', icon: '\u2705' },
};

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------
function ToastItem({ toast: t, onDismiss }) {
  const theme = THEMES[t.type] || THEMES.success;

  return (
    <motion.div
      layout
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      onClick={() => onDismiss(t.id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        background: 'var(--surface-base, #fff)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        borderInlineStart: `4px solid ${theme.color}`,
        borderInlineEnd: `4px solid ${theme.color}`,
        cursor: 'pointer',
        minWidth: '260px',
        maxWidth: '360px',
        color: 'var(--text-primary, #1e293b)',
      }}
    >
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{theme.icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {t.title && (
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{t.title}</p>
        )}
        {t.description && (
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', opacity: 0.75 }}>
            {t.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Provider component — render once near root
// ---------------------------------------------------------------------------
export default function FluentiaToast() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        insetInlineStart: '1rem',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onDismiss={remove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

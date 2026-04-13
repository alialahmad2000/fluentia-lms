import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import AccessibilityPanel from './AccessibilityPanel';

const STORAGE_PREFIX = 'a11y-position-';
const BTN_SIZE = 40;

export default function A11yFloatingButton() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const { profile } = useAuthStore();
  const btnRef = useRef(null);
  const isDragging = useRef(false);
  const movedPx = useRef(0);
  const dragStart = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ px: 0, py: 0 });
  const [pos, setPos] = useState({ x: 16, y: -1 });

  const constrainPos = useCallback((x, y) => {
    const maxX = window.innerWidth - BTN_SIZE - 16;
    const maxY = window.innerHeight - BTN_SIZE - 16;
    return {
      x: Math.max(16, Math.min(maxX, x)),
      y: Math.max(16, Math.min(maxY, y)),
    };
  }, []);

  // Load saved position
  useEffect(() => {
    const key = STORAGE_PREFIX + (profile?.id || 'guest');
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setPos(constrainPos(JSON.parse(saved).x, JSON.parse(saved).y));
      } else {
        setPos({ x: 16, y: window.innerHeight - BTN_SIZE - 90 });
      }
    } catch {
      setPos({ x: 16, y: window.innerHeight - BTN_SIZE - 90 });
    }
  }, [profile?.id, constrainPos]);

  const savePos = useCallback((x, y) => {
    const key = STORAGE_PREFIX + (profile?.id || 'guest');
    try { localStorage.setItem(key, JSON.stringify({ x, y })); } catch {}
  }, [profile?.id]);

  const snapToEdge = useCallback((x, y) => {
    const snapped = constrainPos(x, y);
    const midX = window.innerWidth / 2;
    if (snapped.x < midX) {
      if (snapped.x < 36) snapped.x = 16;
    } else {
      if (snapped.x > window.innerWidth - BTN_SIZE - 36) snapped.x = window.innerWidth - BTN_SIZE - 16;
    }
    return snapped;
  }, [constrainPos]);

  const handlePointerDown = useCallback((e) => {
    isDragging.current = false;
    movedPx.current = 0;
    dragStart.current = { x: pos.x, y: pos.y };
    pointerStart.current = { px: e.clientX, py: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  }, [pos]);

  const handlePointerMove = useCallback((e) => {
    const dx = e.clientX - pointerStart.current.px;
    const dy = e.clientY - pointerStart.current.py;
    movedPx.current = Math.sqrt(dx * dx + dy * dy);
    if (movedPx.current > 5) {
      isDragging.current = true;
      setPos(constrainPos(dragStart.current.x + dx, dragStart.current.y + dy));
    }
  }, [constrainPos]);

  const handlePointerUp = useCallback(() => {
    if (isDragging.current) {
      const snapped = snapToEdge(pos.x, pos.y);
      setPos(snapped);
      savePos(snapped.x, snapped.y);
    } else {
      setOpen(true);
    }
    isDragging.current = false;
  }, [pos, snapToEdge, savePos]);

  // Re-constrain on resize
  useEffect(() => {
    const handler = () => setPos(prev => constrainPos(prev.x, prev.y));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [constrainPos]);

  return (
    <>
      <div
        ref={btnRef}
        className="fixed z-[998]"
        style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
      >
        {hover && !isDragging.current && (
          <div
            className="absolute whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-md pointer-events-none"
            style={{
              bottom: '100%',
              left: 0,
              marginBottom: 6,
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
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label="إعدادات إمكانية الوصول"
          className="w-10 h-10 rounded-full flex items-center justify-center select-none"
          style={{
            background: 'var(--accent-sky, #0284c7)',
            color: '#ffffff',
            boxShadow: 'var(--shadow-md, 0 6px 14px rgba(2,132,199,0.35))',
            border: '1.5px solid rgba(255,255,255,0.2)',
            cursor: isDragging.current ? 'grabbing' : 'grab',
          }}
        >
          <Eye size={16} strokeWidth={2.2} />
        </button>
      </div>

      <AccessibilityPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

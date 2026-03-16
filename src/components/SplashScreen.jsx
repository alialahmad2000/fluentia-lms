import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'fluentia_splash_shown';
const MIN_DISPLAY_MS = 1800;

export default function SplashScreen({ onReady = false }) {
  const [alreadyShown] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [timerDone, setTimerDone] = useState(false);
  const [visible, setVisible] = useState(!alreadyShown);
  const [progress, setProgress] = useState(0);

  // Progress bar animation — fill from 0 to 100 over the display period
  useEffect(() => {
    if (alreadyShown) return;

    const start = performance.now();
    let raf;

    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min((elapsed / MIN_DISPLAY_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [alreadyShown]);

  // Minimum display timer
  useEffect(() => {
    if (alreadyShown) return;
    const id = setTimeout(() => setTimerDone(true), MIN_DISPLAY_MS);
    return () => clearTimeout(id);
  }, [alreadyShown]);

  // Transition out when both timer is done AND onReady is true
  useEffect(() => {
    if (timerDone && onReady) {
      setVisible(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // storage unavailable
      }
    }
  }, [timerDone, onReady]);

  if (alreadyShown) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-base)',
            color: 'var(--text-primary)',
          }}
        >
          {/* Logo / Title */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: 'center' }}
          >
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '3rem',
                fontWeight: 700,
                margin: 0,
                background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Fluentia Academy
            </h1>

            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.5rem',
                marginTop: '0.5rem',
                opacity: 0.85,
              }}
            >
              &#x623;&#x643;&#x627;&#x62F;&#x64A;&#x645;&#x64A;&#x629; &#x637;&#x644;&#x627;&#x642;&#x629;
            </p>
          </motion.div>

          {/* Progress bar */}
          <div
            style={{
              marginTop: '2.5rem',
              width: '220px',
              height: '4px',
              borderRadius: '9999px',
              background: 'rgba(128,128,128,0.2)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                height: '100%',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, var(--accent-sky), var(--accent-violet))',
                width: `${progress}%`,
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

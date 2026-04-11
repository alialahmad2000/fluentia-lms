import { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

const DEFAULTS = {
  fontSize: 'md',        // sm | md | lg | xl | 2xl
  zoom: 100,             // 75 | 100 | 125 | 150 | 175 | 200
  highContrast: false,
  dyslexiaFont: false,
  reduceMotion: false,
  lineSpacing: 'normal', // tight | normal | relaxed | loose
  screenReaderMode: false,
  keyboardNav: false,
  cursorSize: 'normal',  // normal | large | xlarge
};

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('fluentia_a11y');
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch { return DEFAULTS; }
  });

  useEffect(() => {
    try { localStorage.setItem('fluentia_a11y', JSON.stringify(settings)); } catch {}
    const root = document.documentElement;

    // Font size scale
    const fontScales = { sm: '14px', md: '16px', lg: '18px', xl: '20px', '2xl': '24px' };
    root.style.setProperty('--a11y-base-font', fontScales[settings.fontSize] || '16px');

    // Zoom
    root.style.setProperty('--a11y-zoom', `${settings.zoom / 100}`);
    try {
      document.body.style.zoom = `${settings.zoom}%`;
    } catch {
      // Firefox fallback via transform
      document.body.style.transform = `scale(${settings.zoom / 100})`;
      document.body.style.transformOrigin = 'top center';
    }

    // Line spacing
    const spacings = { tight: '1.4', normal: '1.6', relaxed: '1.9', loose: '2.2' };
    root.style.setProperty('--a11y-line-height', spacings[settings.lineSpacing] || '1.6');

    // Toggle classes on <html>
    root.classList.toggle('a11y-high-contrast', settings.highContrast);
    root.classList.toggle('a11y-dyslexia', settings.dyslexiaFont);
    root.classList.toggle('a11y-reduce-motion', settings.reduceMotion);
    root.classList.toggle('a11y-screen-reader', settings.screenReaderMode);
    root.classList.toggle('a11y-keyboard-nav', settings.keyboardNav);

    // Cursor — clear previous then set current
    root.classList.remove('a11y-cursor-normal', 'a11y-cursor-large', 'a11y-cursor-xlarge');
    root.classList.add(`a11y-cursor-${settings.cursorSize}`);
  }, [settings]);

  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  const reset = () => setSettings(DEFAULTS);

  return (
    <AccessibilityContext.Provider value={{ settings, update, reset }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useA11y = () => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    // Safe fallback if called outside provider — return no-op so components never crash
    return { settings: DEFAULTS, update: () => {}, reset: () => {} };
  }
  return ctx;
};

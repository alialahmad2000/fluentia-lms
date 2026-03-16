import { useRef, useState, useEffect } from 'react';

/**
 * Intersection Observer hook.
 * Returns [ref, isVisible].
 * Once visible, stays visible (no toggling back).
 * Respects prefers-reduced-motion — immediately marks as visible if reduced motion is preferred.
 */
export default function useScrollReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If user prefers reduced motion, skip the reveal animation entirely
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.matches) {
        setIsVisible(true);
        return;
      }
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}

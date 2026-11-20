'use client';

import { useEffect, useState } from 'react';

import { animationsActiveFrom, prefersReducedMotion } from './motion';

import { useStore } from './store';

/**
 * Animations actuellement actives ? — réactif : suit le réglage
 * « Animations & célébrations » ET les changements de prefers-reduced-motion
 * du système (bascule immédiate, dans les deux sens).
 */
export function useMotionEnabled(): boolean {
  const animations = useStore((s) => s.settings.animations);
  const [reduced, setReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    // très vieux navigateurs
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  return animationsActiveFrom({ animations });
}

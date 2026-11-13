'use client';

import { useEffect, useState } from 'react';
import { useStore } from './store';

/** true uniquement côté client, après rehydratation du localStorage */
export function useHydrated(): boolean {
  const hydrated = useStore((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!useStore.getState().hydrated) {
      Promise.resolve(useStore.persist.rehydrate?.()).then(() => {
        useStore.getState().setHydrated();
      });
    }
  }, []);

  return mounted && hydrated;
}

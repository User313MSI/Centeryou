'use client';

import { useEffect, useRef } from 'react';

/**
 * Gestes tactiles natifs (aucun paquet ajouté) :
 * - useHorizontalSwipe : glisser horizontalement sur un conteneur (ex. planning)
 *   déclenche onSwipeLeft / onSwipeRight (changer de jour / semaine / mois).
 *   Le défilement vertical reste prioritaire ; le clic qui suit un swipe est ignoré.
 * - useSwipeActions : sur une ligne (ex. tâche) — glisser vers la droite déclenche
 *   onSwipeRight (tâche terminée) avec retour visuel, et un appui long déclenche
 *   onLongPress (menu d'actions).
 */

const IGNORE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [contenteditable="true"]';

function suppressNextClick(el: HTMLElement) {
  const onClick = (ev: Event) => {
    ev.stopPropagation();
    ev.preventDefault();
  };
  el.addEventListener('click', onClick, { capture: true, once: true });
  window.setTimeout(() => el.removeEventListener('click', onClick, { capture: true }), 500);
}

export function useHorizontalSwipe<T extends HTMLElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 64,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const ref = useRef<T | null>(null);
  const handlers = useRef({ onSwipeLeft, onSwipeRight, threshold });
  handlers.current = { onSwipeLeft, onSwipeRight, threshold };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest(IGNORE_SELECTOR)) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
        tracking = false; // défilement vertical : on laisse le navigateur scroller
        return;
      }
      if (Math.abs(dx) >= handlers.current.threshold && Math.abs(dx) > Math.abs(dy)) {
        tracking = false;
        suppressNextClick(el);
        if (dx < 0) handlers.current.onSwipeLeft?.();
        else handlers.current.onSwipeRight?.();
        return;
      }
      // intention horizontale : on bloque le scroll de page pendant le geste
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) e.preventDefault();
    };
    const onTouchEnd = () => {
      tracking = false;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return ref;
}

export function useSwipeActions<T extends HTMLElement>({
  onSwipeRight,
  onLongPress,
  threshold = 72,
  longPressMs = 500,
}: {
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  threshold?: number;
  longPressMs?: number;
}) {
  const ref = useRef<T | null>(null);
  const handlers = useRef({ onSwipeRight, onLongPress, threshold, longPressMs });
  handlers.current = { onSwipeRight, onLongPress, threshold, longPressMs };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let swiped = false;
    let longFired = false;
    let timer: number | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    const resetTransform = () => {
      el.style.transition = 'transform 180ms ease-out';
      el.style.transform = '';
      window.setTimeout(() => {
        el.style.transition = '';
      }, 200);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      swiped = false;
      longFired = false;
      clearTimer();
      timer = window.setTimeout(() => {
        if (tracking && !swiped) {
          longFired = true;
          tracking = false;
          suppressNextClick(el);
          try {
            navigator.vibrate?.(12);
          } catch {
            // vibration indisponible : aucun impact
          }
          handlers.current.onLongPress?.();
        }
      }, handlers.current.longPressMs);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || longFired) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) clearTimer();
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
        tracking = false;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) && dx > 0) {
        // retour visuel pendant le geste (limité à 96 px)
        e.preventDefault();
        el.style.transition = 'none';
        el.style.transform = `translateX(${Math.min(dx, 96)}px)`;
        if (dx >= handlers.current.threshold && !swiped) {
          swiped = true;
          tracking = false;
          clearTimer();
          suppressNextClick(el);
          resetTransform();
          handlers.current.onSwipeRight?.();
        }
      }
    };
    const onTouchEnd = () => {
      clearTimer();
      if (swiped || longFired) {
        tracking = false;
        resetTransform();
      }
      tracking = false;
    };
    const onContextMenu = (e: Event) => {
      if (longFired) e.preventDefault();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('contextmenu', onContextMenu);
    return () => {
      clearTimer();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  return ref;
}

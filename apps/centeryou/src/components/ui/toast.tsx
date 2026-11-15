'use client';

import { X } from 'lucide-react';
import { useUiStore } from '../../lib/ui-store';
import { cx } from '../../lib/utils';

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-toast flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4 md:bottom-8"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto flex min-h-11 items-center gap-3 rounded-pill bg-ink px-4 py-2.5 text-sm text-surface shadow-hover animate-slide-up',
          )}
          role="status"
        >
          <span className="flex-1">{t.message}</span>
          {t.actionLabel && (
            <button
              onClick={() => {
                t.onAction?.();
                dismiss(t.id);
              }}
              className="rounded-pill px-2 py-1 font-semibold text-voice transition-colors duration-fast hover:bg-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voice"
            >
              {t.actionLabel}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Fermer la notification"
            className="flex min-h-8 min-w-8 items-center justify-center rounded-pill text-surface/60 transition-colors duration-fast hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-voice"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

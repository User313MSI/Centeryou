'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../lib/utils';

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    if (panel) {
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        panel.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      target?.focus();
      // clavier mobile (tactile) : le champ focalisé reste visible, jamais masqué par le clavier
      if (target && window.matchMedia('(pointer: coarse)').matches) {
        window.setTimeout(() => target.scrollIntoView({ block: 'center' }), 60);
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-dialog flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'max-h-[90vh] w-full overflow-y-auto rounded-card bg-surface p-6 shadow-hover animate-slide-up',
          wide ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-pill text-muted transition-colors duration-fast hover:bg-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

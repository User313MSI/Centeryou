import { cx } from '../../lib/utils';

/**
 * Ondes concentriques teal — réservées aux éléments vocaux (écoute en cours).
 * En prefers-reduced-motion, l'animation est figée via globals.css.
 */
export function Waves({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx('waves relative inline-flex h-8 w-8 items-center justify-center', className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute rounded-full border-2 border-voice"
          style={{ width: 14 + i * 12, height: 14 + i * 12 }}
        />
      ))}
      <span className="h-2.5 w-2.5 rounded-full bg-voice" />
    </span>
  );
}

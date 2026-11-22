import type { Category } from '../../types';
import { addDaysISO, capitalize, formatWeekdayShort } from '../../lib/dates';
import { CATEGORY_ORDER, formatHoursFr, type WeekStats } from '../../lib/stats';
import { cx } from '../../lib/utils';

/** classes Tailwind des couleurs de catégories (noms complets, visibles par le JIT) */
export const CATEGORY_TEXT_CLASS: Record<Category, string> = {
  travail: 'text-cat-travail',
  perso: 'text-cat-perso',
  sante: 'text-cat-sante',
  focus: 'text-cat-focus',
  autre: 'text-cat-autre',
};
export const CATEGORY_BG_CLASS: Record<Category, string> = {
  travail: 'bg-cat-travail',
  perso: 'bg-cat-perso',
  sante: 'bg-cat-sante',
  focus: 'bg-cat-focus',
  autre: 'bg-cat-autre',
};

/** libellé court capitalisé du jour de semaine i (0 = lundi) */
export function weekdayShortLabel(i: number): string {
  // 2025-01-06 est un lundi (cf. tests/dates.test.ts)
  return capitalize(formatWeekdayShort(addDaysISO('2025-01-06', i)));
}

/**
 * Barres empilées par catégorie : les 4 dernières semaines d'heures planifiées.
 * SVG inline, couleurs via `currentColor` + classes de tokens (thème clair/sombre),
 * animation discrète (translateY + opacité, couverte par prefers-reduced-motion).
 */
export function WeekBars({ weeks }: { weeks: WeekStats[] }) {
  const W = 300;
  const H = 178;
  const baseline = 150;
  const top = 14;
  const maxH = baseline - top;
  const maxVal = Math.max(60, ...weeks.map((w) => w.totalMinutes));
  const slot = (W - 16) / weeks.length;
  const barW = 44;
  const summary = weeks.map((w) => `${w.label} : ${formatHoursFr(w.totalMinutes)}`).join(', ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Temps prévu par semaine — ${summary}`}>
      <line x1={8} x2={W - 8} y1={baseline} y2={baseline} stroke="currentColor" className="text-muted" strokeWidth={1} aria-hidden />
      {weeks.map((w, i) => {
        const x = 8 + i * slot + (slot - barW) / 2;
        const segments = CATEGORY_ORDER.filter((c) => w.byCategory[c] > 0);
        let cum = 0;
        const barTop = baseline - (w.totalMinutes / maxVal) * maxH;
        return (
          <g key={w.start} className="animate-view-in" style={{ animationDelay: `${i * 70}ms` }}>
            {segments.map((c, si) => {
              const m = w.byCategory[c];
              const h = (m / maxVal) * maxH;
              const y = baseline - ((cum + m) / maxVal) * maxH;
              cum += m;
              const isTop = si === segments.length - 1;
              return (
                <rect
                  key={c}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, 0.5)}
                  rx={isTop ? 4 : 0}
                  fill="currentColor"
                  className={CATEGORY_TEXT_CLASS[c]}
                >
                  <title>{`${w.label} — ${formatHoursFr(m)}`}</title>
                </rect>
              );
            })}
            <text
              x={x + barW / 2}
              y={Math.max(10, barTop - 6)}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="currentColor"
              className="text-ink"
            >
              {formatHoursFr(w.totalMinutes)}
            </text>
          </g>
        );
      })}
      {weeks.map((w, i) => {
        const x = 8 + i * slot + slot / 2;
        return (
          <text
            key={`${w.start}-label`}
            x={x}
            y={168}
            textAnchor="middle"
            fontSize={12}
            fill="currentColor"
            className={cx('animate-fade-in', 'text-muted')}
            style={{ animationDelay: `${i * 70 + 120}ms` }}
          >
            {w.label}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * Barres horizontales : minutes planifiées par jour de semaine sur les 28 derniers
 * jours ; le jour le plus chargé est surligné en violet primaire.
 */
export function WeekdayBars({ perWeekday, busiestIndex }: { perWeekday: number[]; busiestIndex: number | null }) {
  const W = 300;
  const rowH = 26;
  const H = 4 + 7 * rowH + 6;
  const barX = 60;
  const maxBarW = W - barX - 58;
  const maxVal = Math.max(1, ...perWeekday);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Temps prévu par jour de la semaine sur les 4 dernières semaines — ${perWeekday
        .map((m, i) => `${weekdayShortLabel(i)} : ${formatHoursFr(m)}`)
        .join(', ')}`}
    >
      {perWeekday.map((m, i) => {
        const y = 4 + i * rowH;
        const w = m > 0 ? Math.max(6, (m / maxVal) * maxBarW) : 0;
        const isBusiest = busiestIndex === i && m > 0;
        return (
          <g key={i} className="animate-view-in" style={{ animationDelay: `${i * 40}ms` }}>
            <text x={0} y={y + 13} fontSize={12} fill="currentColor" className={isBusiest ? 'font-bold text-ink' : 'text-muted'}>
              {weekdayShortLabel(i)}
            </text>
            <rect
              x={barX}
              y={y}
              width={w}
              height={16}
              rx={8}
              fill="currentColor"
              // Sourire (M-10) : barres en primarydark (6,32:1) — primary 4,17:1 et voicetext
              // 3,30:1 sous le seuil ; le jour le plus chargé reste repéré en ink (16:1) + gras
              className={isBusiest ? 'text-ink' : 'text-primarydark'}
            >
              <title>{`${weekdayShortLabel(i)} : ${formatHoursFr(m)}`}</title>
            </rect>
            <text x={barX + w + 6} y={y + 13} fontSize={12} fill="currentColor" className="text-muted">
              {formatHoursFr(m)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Donut sobre : répartition des minutes planifiées par catégorie (28 derniers jours).
 * Cercles SVG en `stroke-dasharray`, couleurs de catégories via `currentColor`.
 */
export function CategoryDonut({
  distribution,
  totalMinutes,
  className,
}: {
  distribution: { category: Category; minutes: number }[];
  totalMinutes: number;
  className?: string;
}) {
  const size = 168;
  const c = size / 2;
  const r = 62;
  const strokeW = 22;
  const circ = 2 * Math.PI * r;
  const gap = distribution.length > 1 ? 2 : 0;
  let cum = 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cx('h-auto', className)}
      role="img"
      aria-label={`Répartition du temps prévu par catégorie sur les 4 dernières semaines — ${distribution
        .map((d) => `${d.category} : ${formatHoursFr(d.minutes)}`)
        .join(', ')}`}
    >
      <g className="animate-fade-in">
        {totalMinutes === 0 ? (
          <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} className="text-line" />
        ) : (
          <g transform={`rotate(-90 ${c} ${c})`}>
            {distribution.map((d) => {
              const len = Math.max(0, (d.minutes / totalMinutes) * circ - gap);
              const el = (
                <circle
                  key={d.category}
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={strokeW}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-cum}
                  className={CATEGORY_TEXT_CLASS[d.category]}
                >
                  <title>{`${d.category} : ${formatHoursFr(d.minutes)}`}</title>
                </circle>
              );
              cum += (d.minutes / totalMinutes) * circ;
              return el;
            })}
          </g>
        )}
        <text x={c} y={c - 2} textAnchor="middle" fontSize={20} fontWeight={800} fill="currentColor" className="text-ink">
          {formatHoursFr(totalMinutes)}
        </text>
        <text x={c} y={c + 18} textAnchor="middle" fontSize={12} fill="currentColor" className="text-muted">
          sur 4 semaines
        </text>
      </g>
    </svg>
  );
}

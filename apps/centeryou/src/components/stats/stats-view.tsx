'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, ChartColumn, ChartPie, Flame, Gauge, Minus, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { CATEGORY_BG_CLASS, CategoryDonut, WeekdayBars, WeekBars } from './charts';
import { categoryLabel } from '../../lib/categories';

import { todayISO } from '../../lib/dates';

import { isNewRecord, readRecord, writeRecord } from '../../lib/motion';

import { useMotionEnabled } from '../../lib/use-motion';
import { computeStats, formatDeltaFr, formatHoursFr, type CompletionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { cx } from '../../lib/utils';

function CompletionRow({ label, stats }: { label: string; stats: CompletionStats }) {
  const pct = stats.percent ?? 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="font-bold text-primarydark">{stats.percent === null ? '—' : `${stats.percent} %`}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Tâches accomplies — ${label}`}
        className="h-3 overflow-hidden rounded-pill bg-line/70"
      >
        {/* Sourire (M-10) : remplissage bg-primarydark (≥ 5,6:1 contre la piste), voir progress-bar */}
        <div className="h-full rounded-pill bg-primarydark transition-all duration-normal ease-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted">
        {stats.total === 0
          ? 'Aucune tâche sur cette période'
          : `${stats.done} sur ${stats.total} tâche${stats.total > 1 ? 's' : ''} faite${stats.done > 1 ? 's' : ''}`}
      </p>
    </div>
  );
}

export function StatsView() {
  const router = useRouter();
  const events = useStore((s) => s.events);
  const tasks = useStore((s) => s.tasks);
  const today = todayISO();
  const stats = useMemo(() => computeStats(events, tasks, today), [events, tasks, today]);

  // célébrations actives ? (réglage + prefers-reduced-motion) — tout redevient statique sinon
  const motionOn = useMotionEnabled();
  const serieRef = useRef<HTMLParagraphElement>(null);

  // nouveau record (série de jours organisés battue) : un petit feu d'artifice discret, une seule fois
  // (import dynamique : le chunk des célébrations n'est chargé que si un record est battu)
  useEffect(() => {
    if (!motionOn || !stats.hasData) return;
    const KEY = 'centeryou-record-serie';
    const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
    const prev = readRecord(storage, KEY);
    if (isNewRecord(prev, stats.streak)) {
      writeRecord(storage, KEY, stats.streak);
      void import('../../lib/celebrate').then((m) => m.spawnFireworkAt(serieRef.current));
    }
  }, [motionOn, stats.hasData, stats.streak]);

  const currentWeek = stats.weeks[stats.weeks.length - 1];
  const legendCategories = stats.weeks
    .reduce((acc, w) => {
      for (const c of Object.keys(w.byCategory) as (keyof typeof w.byCategory)[]) acc[c] += w.byCategory[c];
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-5">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink md:text-4xl">Statistiques</h1>
        <p className="mt-1 text-sm font-semibold text-muted">
          Tout est calculé sur ton appareil, à partir de ton agenda et de tes tâches — rien n&rsquo;est envoyé en ligne.
        </p>
      </header>

      {!stats.hasData ? (
        <EmptyState
          icon={ChartPie}
          title="Ajoute une tâche ou un événement pour remplir tes statistiques"
          description="Dès que tu ajoutes quelque chose, tout est calculé ici, sur ton appareil — rien n’est envoyé en ligne."
          example="sport demain 14h"
          action={{ label: "Aller à Aujourd'hui", onClick: () => router.push('/aujourdhui') }}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-base font-bold text-ink">
                <ChartColumn size={18} aria-hidden className="text-primarydark" /> Temps prévu par semaine
              </h2>
              <span
                className={cx(
                  'flex items-center gap-1 text-sm font-bold',
                  stats.weekDelta !== null && stats.weekDelta > 0 ? 'text-primarydark' : 'text-muted',
                )}
                title="Changement par rapport à la semaine précédente"
              >
                {stats.weekDelta !== null && stats.weekDelta > 0 && <ArrowUpRight size={16} aria-hidden />}
                {stats.weekDelta !== null && stats.weekDelta < 0 && <ArrowDownRight size={16} aria-hidden />}
                {stats.weekDelta === 0 && <Minus size={16} aria-hidden />}
                {formatDeltaFr(stats.weekDelta)}
              </span>
            </CardHeader>
            <CardBody>
              <WeekBars weeks={stats.weeks} />
              <p className="mt-1 text-xs text-muted">
                {currentWeek
                  ? `Cette semaine : ${formatHoursFr(currentWeek.totalMinutes)} au planning · ${formatDeltaFr(stats.weekDelta)} par rapport à la semaine précédente`
                  : ''}
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Légende des catégories">
                {Object.entries(legendCategories)
                  .filter(([, m]) => m > 0)
                  .map(([c, m]) => (
                    <li key={c} className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <span aria-hidden className={cx('h-2.5 w-2.5 rounded-full', CATEGORY_BG_CLASS[c as keyof typeof CATEGORY_BG_CLASS])} />
                      {categoryLabel(c as Parameters<typeof categoryLabel>[0])} · {formatHoursFr(m)}
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>

          {stats.insight && (
            <Card className="border-primary/25 bg-primary/5">
              <CardHeader>
                <h2 className="flex items-center gap-2 text-base font-bold text-ink">
                  <Sparkles size={18} aria-hidden className="text-primarydark" /> Un mot sur ta semaine
                </h2>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-relaxed text-ink md:text-base">{stats.insight}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-base font-bold text-ink">
                <Gauge size={18} aria-hidden className="text-primarydark" /> Habitudes
              </h2>
            </CardHeader>
            <CardBody className="flex flex-col gap-6">
              <section aria-labelledby="stats-jours" className="flex flex-col gap-2">
                <h3 id="stats-jours" className="text-sm font-bold text-ink">
                  Jours les plus chargés
                </h3>
                {stats.totalMinutes > 0 ? (
                  <>
                    <WeekdayBars perWeekday={stats.perWeekday} busiestIndex={stats.busiest?.index ?? null} />
                    <p className="text-xs text-muted">Temps prévu chaque jour de la semaine, sur les 4 dernières semaines.</p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Rien de prévu sur les 4 dernières semaines.</p>
                )}
              </section>

              <section aria-labelledby="stats-categories" className="flex flex-col gap-3">
                <h3 id="stats-categories" className="text-sm font-bold text-ink">
                  Répartition par catégorie
                </h3>
                {stats.distribution.length > 0 ? (
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                    <CategoryDonut distribution={stats.distribution} totalMinutes={stats.totalMinutes} className="w-40 shrink-0" />
                    <ul className="flex w-full flex-col gap-2" aria-label="Répartition par catégorie">
                      {stats.distribution.map(({ category, minutes }) => {
                        const pct = Math.round((minutes / stats.totalMinutes) * 100);
                        return (
                          <li key={category} className="flex items-center gap-2 text-sm">
                            <span aria-hidden className={cx('h-3 w-3 shrink-0 rounded-full', CATEGORY_BG_CLASS[category])} />
                            <span className="font-semibold text-ink">{categoryLabel(category)}</span>
                            <span className="ml-auto font-semibold text-muted">
                              {formatHoursFr(minutes)} · {pct} %
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Pas encore de temps à répartir.</p>
                )}
              </section>

              <section aria-labelledby="stats-taches" className="flex flex-col gap-3">
                <h3 id="stats-taches" className="text-sm font-bold text-ink">
                  Tes tâches
                </h3>
                <CompletionRow label="Sur 7 jours" stats={stats.completion7} />
                <CompletionRow label="Sur 30 jours" stats={stats.completion30} />
                <p ref={serieRef} id="stats-serie" className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Flame size={16} aria-hidden className="text-warning" />
                  {stats.streak > 0
                    ? stats.streak > 1
                      ? `${stats.streak} jours de suite`
                      : '1 jour de suite'
                    : 'Pas encore de jours de suite'}
                  <span className="text-xs font-semibold text-muted">(au moins une tâche faite chaque jour)</span>
                </p>
              </section>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarRange, Info, ListChecks } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardBody, CardHeader } from '../ui/card';
import { WeekView } from '../events/week-view';
import { categoryLabel, priorityLabel } from '../../lib/categories';
import type { TaskItem } from '../../types';
import { demoWeek, DEMO_PROFILE } from '../../lib/demo-data';
import { formatDayShort, formatTimeFr, todayISO, startOfWeekISO, formatDayLong } from '../../lib/dates';

const noop = () => undefined;

function DemoTaskRow({ task }: { task: TaskItem }) {
  return (
    <li className="flex items-center gap-3 rounded-card border border-line/70 bg-surface p-3 shadow-card">
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${task.done ? 'border-voice bg-voice' : 'border-line bg-surface'}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${task.done ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge tone={task.priority} withDot>
            {priorityLabel(task.priority)}
          </Badge>
          <Badge tone={task.category} withDot>
            {categoryLabel(task.category)}
          </Badge>
          <span className="rounded-pill bg-line/60 px-2 py-0.5 text-xs text-muted">{formatDayShort(task.date)}</span>
          {task.time && <span className="rounded-pill bg-line/60 px-2 py-0.5 text-xs text-muted">{formatTimeFr(task.time)}</span>}
        </div>
      </div>
    </li>
  );
}

export function DemoView() {
  const [cursor, setCursor] = useState('');
  useEffect(() => setCursor(todayISO()), []);
  const demo = useMemo(() => (cursor ? demoWeek(cursor) : null), [cursor]);

  const weekLabel = cursor ? `Semaine du ${formatDayLong(startOfWeekISO(cursor))}` : '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start justify-between gap-3 rounded-card border border-voice/40 bg-voice/5 px-5 py-4 md:flex-row md:items-center" role="status">
        <p className="flex items-start gap-2 text-sm text-ink">
          <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-primarydark" />
          <span>
            <strong>Mode démo — lecture seule.</strong> Voici la semaine type de <strong>{DEMO_PROFILE.prenom}</strong>,{' '}
            {DEMO_PROFILE.role}. Données fictives : aucune donnée réelle, aucun compte requis, rien n’est enregistré.
          </span>
        </p>
        <Link
          href="/inscription"
          className="inline-flex min-h-11 shrink-0 items-center rounded-pill bg-primarydark px-5 text-sm font-semibold text-surface shadow-card transition-all duration-normal ease-out hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]"
        >
          Créer mon compte
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">
          La semaine de {DEMO_PROFILE.prenom}, {DEMO_PROFILE.role}
        </h1>
        <p className="mt-1 text-sm font-semibold capitalize text-muted">{weekLabel}</p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <CalendarRange size={18} aria-hidden className="text-primarydark" /> Son planning de la semaine
          </h2>
        </CardHeader>
        <CardBody className="p-2 md:p-4">
          {demo ? (
            <WeekView
              cursor={cursor}
              events={demo.events}
              tasks={demo.tasks}
              dayStart={8}
              onSlotClick={noop}
              onEventClick={noop}
              onTaskToggle={noop}
              onDropAt={noop}
              onDayClick={noop}
              readOnly
            />
          ) : (
            <div className="h-[280px] animate-pulse rounded-card bg-bg md:h-[360px]" aria-hidden />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <ListChecks size={18} aria-hidden className="text-primarydark" /> Ses tâches de la semaine
          </h2>
          <span className="text-sm font-semibold text-muted">{demo ? `${demo.tasks.filter((t) => t.done).length}/${demo.tasks.length} faites` : ''}</span>
        </CardHeader>
        <CardBody>
          {demo ? (
            <ul className="flex flex-col gap-2.5" aria-label="Tâches de la démo (lecture seule)">
              {[...demo.tasks]
                .sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
                .map((t) => (
                  <DemoTaskRow key={t.id} task={t} />
                ))}
            </ul>
          ) : (
            <div className="h-[120px] animate-pulse rounded-card bg-bg" aria-hidden />
          )}
        </CardBody>
      </Card>

      <p className="text-center text-sm text-muted">
        Envie du même planning pour toi ?{' '}
        <Link href="/inscription" className="font-semibold text-primarydark underline-offset-2 hover:underline">
          Créer mon compte →
        </Link>
      </p>
    </div>
  );
}

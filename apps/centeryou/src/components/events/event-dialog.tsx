'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CATEGORY_LIST } from '../../lib/categories';
import { DAY_END, DAY_START, endMinutesOf, formatRangeFr, minutesOf, timeOf, todayISO } from '../../lib/dates';
import { findConflict } from '../../lib/events';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import type { Category, Repeat } from '../../types';
import { clamp, cx } from '../../lib/utils';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input } from '../ui/input';

const REPEAT_OPTIONS: { id: Repeat; label: string }[] = [
  { id: 'jamais', label: 'Ne se répète pas' },
  { id: 'jour', label: 'Chaque jour' },
  { id: 'semaine', label: 'Chaque semaine' },
  { id: 'mois', label: 'Chaque mois' },
];

function nextSlot(): string {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  const next = Math.ceil((m + 1) / 60) * 60;
  return timeOf(clamp(next, DAY_START * 60, DAY_END * 60 - 60));
}

const selectClass =
  'w-full min-h-11 rounded-card border border-line bg-surface px-4 text-base text-ink transition-colors duration-fast ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export function EventDialog() {
  const eventDialog = useUiStore((s) => s.eventDialog);
  const closeEventDialog = useUiStore((s) => s.closeEventDialog);
  const pushToast = useUiStore((s) => s.pushToast);
  const events = useStore((s) => s.events);
  const addEvent = useStore((s) => s.addEvent);
  const updateEvent = useStore((s) => s.updateEvent);
  const deleteEvent = useStore((s) => s.deleteEvent);

  const editing = eventDialog.eventId ? events.find((e) => e.id === eventDialog.eventId) : undefined;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState(nextSlot());
  const [end, setEnd] = useState(timeOf(minutesOf(nextSlot()) + 60));
  const [category, setCategory] = useState<Category>('autre');
  const [repeat, setRepeat] = useState<Repeat>('jamais');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventDialog.open) return;
    setError(null);
    if (editing) {
      setTitle(editing.title);
      setDate(editing.date);
      setStart(editing.start);
      setEnd(editing.end);
      setCategory(editing.category);
      setRepeat(editing.repeat);
    } else {
      const d = eventDialog.date ?? todayISO();
      const s = eventDialog.start ?? nextSlot();
      setTitle('');
      setDate(d);
      setStart(s);
      setEnd(timeOf(Math.min(minutesOf(s) + 60, 24 * 60 - 1)));
      setCategory('autre');
      setRepeat('jamais');
    }
  }, [eventDialog, editing]);

  const conflict = useMemo(() => {
    if (!date || !start || !end) return null;
    // fin à 00:00 = minuit (24h00) : acceptée, elle doit juste rester après le début
    if (endMinutesOf(end) <= minutesOf(start)) return null;
    return findConflict(events, { date, start, end }, editing?.id);
  }, [events, date, start, end, editing?.id]);

  const save = () => {
    const t = title.trim();
    if (!t) {
      setError('Donne un titre à ton événement.');
      return;
    }
    if (!date) {
      setError('Choisis une date.');
      return;
    }
    if (endMinutesOf(end) <= minutesOf(start)) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    if (conflict?.exact) {
      setError(
        `Ce créneau est déjà pris par « ${conflict.other.title} » (${formatRangeFr(conflict.other.start, conflict.other.end)}). Choisis un autre horaire.`,
      );
      return;
    }
    if (editing) {
      updateEvent(editing.id, { title: t, date, start, end, category, repeat });
      pushToast({ message: `Événement modifié : « ${t} »` });
    } else {
      addEvent({ title: t, date, start, end, category, repeat });
      pushToast({ message: `Événement ajouté : « ${t} »` });
    }
    closeEventDialog();
  };

  const remove = () => {
    if (!editing) return;
    deleteEvent(editing.id);
    pushToast({
      message: `« ${editing.title} » supprimé`,
      actionLabel: 'Annuler',
      duration: 5000,
      onAction: () =>
        addEvent({
          title: editing.title,
          date: editing.date,
          start: editing.start,
          end: editing.end,
          category: editing.category,
          repeat: editing.repeat,
        }),
    });
    closeEventDialog();
  };

  return (
    <Dialog
      open={eventDialog.open}
      onClose={closeEventDialog}
      title={editing ? 'Modifier l’événement' : 'Nouvel événement'}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Titre" htmlFor="ev-title">
          <Input
            id="ev-title"
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. : Réunion équipe"
            maxLength={80}
          />
        </Field>
        <Field label="Date" htmlFor="ev-date">
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début" htmlFor="ev-start">
            <Input id="ev-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fin" htmlFor="ev-end">
            <Input id="ev-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 block text-sm font-semibold text-ink">Catégorie</legend>
          <div role="radiogroup" aria-label="Catégorie de l’événement" className="flex flex-wrap gap-2">
            {CATEGORY_LIST.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategory(c.id)}
                  className={cx(
                    'flex min-h-11 items-center gap-2 rounded-pill border px-3.5 text-sm font-semibold transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    active ? 'border-primary bg-primary/10 text-ink' : 'border-line text-muted hover:border-primary/50 hover:text-ink',
                  )}
                >
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field label="Répéter" htmlFor="ev-repeat">
          <select id="ev-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} className={selectClass}>
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        {error && (
          <p role="alert" className="rounded-card bg-danger/10 px-4 py-3 text-sm font-semibold text-ink">
            {error}
          </p>
        )}
        {!error && conflict && !conflict.exact && (
          <p role="status" className="rounded-card bg-warning/15 px-4 py-3 text-sm text-ink">
            Chevauchement avec « {conflict.other.title} » ({formatRangeFr(conflict.other.start, conflict.other.end)}) — l’événement sera quand même enregistré.
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {editing && (
            <Button variant="danger" size="md" onClick={remove} className="mr-auto">
              <Trash2 size={16} aria-hidden /> Supprimer
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={closeEventDialog}>
            Annuler
          </Button>
          <Button variant="primary" size="md" type="submit">
            {editing ? 'Enregistrer' : 'Créer l’événement'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

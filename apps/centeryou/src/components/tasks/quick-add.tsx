'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { formatDayShort, formatTimeFr } from '../../lib/dates';
import { parseInput } from '../../lib/parser';
import { useStore } from '../../lib/store';
import { useUiStore } from '../../lib/ui-store';
import { playBlip } from '../../lib/voice';
import { cx } from '../../lib/utils';

const DEFAULT_PLACEHOLDER = 'Ajoute vite : « sport demain 14h », « dentist mardi 10h30 santé », « !lundi réunion »…';
const LARGE_PLACEHOLDER = 'Ajoute vite : sport demain 14h…';

export function QuickAdd({ large = false, suggestions = [] }: { large?: boolean; suggestions?: string[] }) {
  const [value, setValue] = useState('');
  const addTask = useStore((s) => s.addTask);
  const sounds = useStore((s) => s.settings.sounds);
  const pushToast = useUiStore((s) => s.pushToast);

  const submitText = (rawInput: string) => {
    const raw = rawInput.trim();
    if (!raw) return;
    const p = parseInput(raw);
    addTask({ title: p.title, date: p.date, time: p.time, category: p.category, priority: p.priority });
    if (sounds) playBlip(720);
    pushToast({
      message: `Tâche ajoutée : « ${p.title} » — ${formatDayShort(p.date)}${p.time ? ` à ${formatTimeFr(p.time)}` : ''}${p.priority === 'haute' ? ' · priorité haute' : ''}${p.category !== 'autre' ? ` · ${p.category}` : ''}`,
    });
    setValue('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    submitText(value);
  };

  return (
    <div className={cx('flex flex-col', large ? 'gap-3' : 'gap-2')}>
      <form onSubmit={submit} className={cx('flex flex-col sm:flex-row', large ? 'gap-3' : 'gap-2')}>
        <Input
          id="quick-add-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={large ? LARGE_PLACEHOLDER : DEFAULT_PLACEHOLDER}
          aria-label="Ajout rapide de tâche en langage naturel"
          maxLength={140}
          className={large ? 'min-h-14 rounded-pill px-6 text-lg shadow-card' : undefined}
        />
        <Button type="submit" size={large ? 'lg' : 'md'} className={large ? 'shrink-0 sm:px-8' : 'shrink-0'}>
          <Plus size={18} aria-hidden /> Ajouter
        </Button>
      </form>
      {large && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Suggestions rapides">
          <span className="text-xs font-semibold text-muted">Essayer :</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submitText(s)}
              className="min-h-11 rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-muted transition-all duration-fast ease-out hover:border-primary hover:text-primarydark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

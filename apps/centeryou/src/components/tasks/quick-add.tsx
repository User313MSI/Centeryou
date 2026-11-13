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

export function QuickAdd() {
  const [value, setValue] = useState('');
  const addTask = useStore((s) => s.addTask);
  const sounds = useStore((s) => s.settings.sounds);
  const pushToast = useUiStore((s) => s.pushToast);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return;
    const p = parseInput(raw);
    addTask({ title: p.title, date: p.date, time: p.time, category: p.category, priority: p.priority });
    if (sounds) playBlip(720);
    pushToast({
      message: `Tâche ajoutée : « ${p.title} » — ${formatDayShort(p.date)}${p.time ? ` à ${formatTimeFr(p.time)}` : ''}${p.priority === 'haute' ? ' · priorité haute' : ''}${p.category !== 'autre' ? ` · ${p.category}` : ''}`,
    });
    setValue('');
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        id="quick-add-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ajoute vite : « sport demain 14h », « dentist mardi 10h30 santé », « !lundi réunion »…"
        aria-label="Ajout rapide de tâche en langage naturel"
        maxLength={140}
      />
      <Button type="submit" className="shrink-0">
        <Plus size={18} aria-hidden /> Ajouter
      </Button>
    </form>
  );
}

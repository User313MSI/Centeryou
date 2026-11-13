'use client';

import { useEffect, useState } from 'react';
import { LogoWithName } from '../brand/logo';
import { capitalize, formatDayLong, todayISO } from '../../lib/dates';

export function Topbar() {
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(formatDayLong(todayISO()));
  }, []);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-8">
      <div className="md:hidden">
        <LogoWithName size={30} />
      </div>
      <p className="hidden text-sm font-semibold text-muted md:block" aria-live="polite">
        {today ? capitalize(today) : ''}
      </p>
      <p className="text-sm font-semibold text-muted md:hidden">{today ? capitalize(today) : ''}</p>
    </header>
  );
}

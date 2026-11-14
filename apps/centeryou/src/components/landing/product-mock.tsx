'use client';

import { useEffect, useMemo, useState } from 'react';
import { WeekView } from '../events/week-view';
import { demoWeek } from '../../lib/demo-data';
import { todayISO } from '../../lib/dates';

const noop = () => undefined;

export function ProductMock() {
  const [cursor, setCursor] = useState('');
  useEffect(() => setCursor(todayISO()), []);
  const demo = useMemo(() => (cursor ? demoWeek(cursor) : null), [cursor]);

  if (!demo) {
    return <div className="h-[280px] animate-pulse rounded-card bg-bg md:h-[360px]" aria-hidden />;
  }

  return (
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
    />
  );
}

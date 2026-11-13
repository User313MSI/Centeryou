/** Résout la zone de dépôt (créneau horaire) sous un point client (drag & drop pointer). */
export function resolveDropZone(x: number, y: number): { date: string; minutes: number } | null {
  if (typeof document === 'undefined') return null;
  const el = document.elementFromPoint(x, y);
  const zone = el?.closest('[data-drop]');
  if (zone instanceof HTMLElement && zone.dataset.date) {
    return { date: zone.dataset.date, minutes: Number(zone.dataset.minutes ?? 0) };
  }
  return null;
}

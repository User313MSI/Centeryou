'use client';

export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">
          {total === 0 ? 'Aucune tâche aujourd’hui' : `${done}/${total} tâche${total > 1 ? 's' : ''} accomplie${done > 1 ? 's' : ''}`}
        </span>
        <span className="font-bold text-primarydark">{pct} %</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression des tâches du jour"
        className="h-3 overflow-hidden rounded-pill bg-line/70"
      >
        {/* Sourire (M-10) : remplissage bg-primarydark — 5,6:1 contre la piste bg-line/70
            (bg-voice n'en faisait que ~1,6:1 en clair) ; le teal reste réservé à la voix */}
        <div
          className="h-full rounded-pill bg-primarydark transition-all duration-normal ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

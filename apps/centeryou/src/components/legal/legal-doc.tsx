import type { ReactNode } from 'react';

export function LegalDoc({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        {meta && <p className="mt-1 text-sm font-semibold text-muted">{meta}</p>}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line/70 bg-surface px-5 py-4 shadow-card">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <div className="mt-2.5 flex flex-col gap-2.5 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <circle cx="20" cy="20" r="19" className="fill-primary" />
      <path
        d="M10.5 20c2.2-4.4 4.4-4.4 6.6 0s4.4 4.4 6.6 0 4.4-4.4 6.3 0"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="stroke-voice"
      />
    </svg>
  );
}

export function LogoWithName({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="text-lg font-extrabold tracking-tight text-ink">Centeryou</span>
    </span>
  );
}

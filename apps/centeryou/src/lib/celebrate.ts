'use client';

/**
 * Célébrations Centeryou (Paillette) — effets DOM pilotés en requestAnimationFrame
 * (et keyframes CSS pour l'onde), ZÉRO dépendance.
 *
 * Règles absolues :
 * - transform / opacity UNIQUEMENT (aucun re-layout, aucun reflow) ;
 * - pointer-events: none partout (glisser-déposer et cibles tactiles intacts) ;
 * - micro-confettis contenus DANS le bloc hôte, jamais plein écran ;
 * - chaque effet vérifie lui-même motionAllowed() : si le réglage est désactivé
 *   ou si prefers-reduced-motion est actif, RIEN n'est créé (statique instantané).
 */

import { CELEBRATE_PALETTE, animationsActiveFrom } from './motion';

import { playDing, playPop, playRecord } from './sons';

import { useStore } from './store';

/** gate de sécurité : aucune célébration si animations désactivées ou prefers-reduced-motion */
export function motionAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  return animationsActiveFrom(useStore.getState().settings);
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** requestAnimationFrame avec repli setTimeout (SSR / jsdom sans pretendToBeVisual) */
function requestFrame(cb: (t: number) => void): number {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') return window.requestAnimationFrame(cb);
  return window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
}

function cancelFrame(id: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(id);
  else window.clearTimeout(id as unknown as Parameters<typeof window.clearTimeout>[0]);
}

/** petite vibration mobile très courte (cochage d'une tâche) — no-op si indisponible */
export function vibrateShort(): void {
  if (!motionAllowed()) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(30);
  } catch {
    // vibration indisponible (desktop) : aucun impact
  }
}

/** onde violette depuis un point (création d'un événement) — un seul anneau, retiré à la fin */
export function spawnRipple(x: number, y: number): void {
  playPop(); // Diapason (M-16) : « pop » velouté — le son ne dépend PAS du réglage d'animations
  if (!motionAllowed() || typeof document === 'undefined') return;
  const el = document.createElement('span');
  el.className = 'celebrate-ripple';
  el.setAttribute('aria-hidden', 'true');
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
  document.body.appendChild(el);
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    el.remove();
  };
  el.addEventListener('animationend', cleanup);
  window.setTimeout(cleanup, 900); // secours si animationend ne se déclenche pas
}

/** onde violette centrée sur un élément (point de création = centre du bloc apparu) */
export function spawnRippleAt(el: HTMLElement | null): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  spawnRipple(r.left + r.width / 2, r.top + r.height / 2);
}

/**
 * Micro-confettis discrets, contenus DANS `host` (jamais plein écran) :
 * une surcouche absolute en overflow:hidden, ~12 particules animées en rAF
 * (translation + rotation + fondu), supprimée à la fin.
 */
export function spawnConfetti(host: HTMLElement | null): void {
  playDing(); // Diapason (M-16) : « ding » chaleureux à la coche — même si les animations sont coupées
  if (!motionAllowed() || !host || typeof document === 'undefined') return;
  if (window.getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const rect = host.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = 'celebrate-confetti';
  overlay.setAttribute('aria-hidden', 'true');
  const COUNT = 12;
  const ox = 28; // origine : près de la coche
  const oy = rect.height / 2;
  const parts: { el: HTMLElement; vx: number; vy: number; rot: number; life: number }[] = [];
  for (let i = 0; i < COUNT; i += 1) {
    const el = document.createElement('span');
    const size = rand(4, 7);
    el.style.width = `${size}px`;
    el.style.height = `${Math.max(3, size * rand(0.6, 1))}px`;
    el.style.background = CELEBRATE_PALETTE[i % CELEBRATE_PALETTE.length];
    el.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
    overlay.appendChild(el);
    const angle = rand(-Math.PI, 0); // envolée vers le haut
    const speed = rand(70, 160);
    parts.push({
      el,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(20, 60),
      rot: rand(-540, 540),
      life: rand(0.55, 0.85),
    });
  }
  host.appendChild(overlay);
  const g = 340;
  const t0 = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = (now - t0) / 1000;
    let alive = false;
    for (const p of parts) {
      if (t >= p.life) {
        p.el.style.opacity = '0';
        continue;
      }
      alive = true;
      const x = ox + p.vx * t - 3;
      const y = oy + p.vy * t + 0.5 * g * t * t;
      p.el.style.transform = `translate(${x}px, ${y}px) rotate(${p.rot * t}deg)`;
      p.el.style.opacity = String(Math.max(0, 1 - t / p.life));
    }
    if (alive) raf = requestFrame(step);
    else overlay.remove();
  };
  raf = requestFrame(step);
  window.setTimeout(() => {
    cancelFrame(raf);
    overlay.remove();
  }, 2000); // sécurité : jamais plus de 2 s
}

/** petit feu d'artifice discret depuis un point (record /stats) — rayon limité (~92 px), rAF */
export function spawnFirework(x: number, y: number): void {
  playRecord(); // Diapason (M-16) : petit motif discret quand un record est battu
  if (!motionAllowed() || typeof document === 'undefined') return;
  const layer = document.createElement('div');
  layer.className = 'celebrate-firework';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${Math.round(x)}px`;
  layer.style.top = `${Math.round(y)}px`;
  document.body.appendChild(layer);
  const COUNT = 22;
  const R = 92;
  const parts: { el: HTMLElement; vx: number; vy: number; life: number }[] = [];
  for (let i = 0; i < COUNT; i += 1) {
    const el = document.createElement('span');
    const size = rand(3, 5.5);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = CELEBRATE_PALETTE[i % CELEBRATE_PALETTE.length];
    el.style.borderRadius = '50%';
    layer.appendChild(el);
    const angle = (i / COUNT) * Math.PI * 2 + rand(-0.12, 0.12);
    const speed = rand(0.55, 1) * (R / 0.8);
    parts.push({ el, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(0.7, 1) });
  }
  const flash = document.createElement('span');
  flash.className = 'celebrate-firework-flash';
  layer.appendChild(flash);
  const g = 120;
  const t0 = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = (now - t0) / 1000;
    let alive = false;
    for (const p of parts) {
      if (t >= p.life) {
        p.el.style.opacity = '0';
        continue;
      }
      alive = true;
      const x = p.vx * t - 2;
      const y = p.vy * t + 0.5 * g * t * t - 2;
      p.el.style.transform = `translate(${x}px, ${y}px)`;
      p.el.style.opacity = String(Math.max(0, 1 - Math.pow(t / p.life, 1.4)));
    }
    if (t < 0.35) {
      const k = t / 0.35;
      flash.style.transform = `scale(${0.4 + k * 1.6})`;
      flash.style.opacity = String(1 - k);
      alive = true;
    }
    if (alive) raf = requestFrame(step);
    else layer.remove();
  };
  raf = requestFrame(step);
  window.setTimeout(() => {
    cancelFrame(raf);
    layer.remove();
  }, 2500); // sécurité
}

/** petit feu d'artifice discret centré sur un élément (ex. la série record de /stats) */
export function spawnFireworkAt(el: HTMLElement | null): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  spawnFirework(r.left + r.width / 2, r.top + r.height / 2);
}

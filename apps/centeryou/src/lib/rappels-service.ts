import type { EventItem, Settings, TaskItem } from '../types';

import { formatDayShort, formatTimeFr, toISODate } from './dates';

import { eventOccursOn } from './events';

import {
  applyShown,
  buildEventNotification,
  buildTasksNotification,
  computeDueReminders,
  loadRappelState,
  markOccurrenceDone,
  notificationActionsSupported,
  parseRappelParam,
  rappelPermission,
  saveRappelState,
  showRappelNotification,
  snoozeOccurrence,
  pruneRappelState,
  type RappelNotification,
  type RappelParam,
  type RappelPermission,
  type RappelState,
} from './rappels';

import { useStore } from './store';

import { useUiStore } from './ui-store';

/**
 * Moteur de rappels (M-04) — service LOCAL, démarré en import dynamique depuis app-shell
 * (zéro poids au premier chargement). Il vérifie toutes les 30 s, à l'heure locale murale,
 * les rappels à déclencher et envoie des notifications navigateur LOCALES (jamais de push
 * serveur). Fonctionne quand l'app est ouverte ou en arrière-plan — c'est tout.
 */

export const RAPPEL_TICK_MS = 30_000;

/** durée de la mise en vedette après un clic sur une notification */
export const HIGHLIGHT_MS = 9_000;

export interface TickDeps {
  now?: () => Date;
  permission?: () => RappelPermission;
  actionsSupported?: () => boolean;
  show?: (n: RappelNotification) => Promise<boolean> | boolean;
  pushToast?: (t: { message: string; actionLabel?: string; onAction?: () => void; duration?: number }) => void;
  getData?: () => { events: EventItem[]; tasks: TaskItem[]; settings: Settings };
  getRappelState?: () => RappelState;
  saveRappelState?: (s: RappelState) => void;
}

/**
 * Un passage du moteur. Anti-spam strict : une notification par occurrence (tampon persisté),
 * jamais rien si la permission est refusée, et on marque même si l'affichage a échoué pour
 * ne jamais spammer. Renvoie le nouvel état du tampon.
 */
export async function runRappelTick(deps: TickDeps = {}): Promise<RappelState> {
  const now = deps.now?.() ?? new Date();
  const data = deps.getData?.() ?? useStore.getState();
  const { events, tasks, settings } = data;
  let state = deps.getRappelState?.() ?? loadRappelState();
  state = pruneRappelState(state, toISODate(now), now.getTime());
  const permission = deps.permission?.() ?? rappelPermission();
  if (settings.reminders && permission === 'granted') {
    const { reminders, tasks: tasksDue } = computeDueReminders(events, tasks, settings, now, state);
    const actionsOk = deps.actionsSupported?.() ?? notificationActionsSupported();
    const show = deps.show ?? showRappelNotification;
    const pushToast = deps.pushToast ?? ((t: { message: string; actionLabel?: string; onAction?: () => void; duration?: number }) => useUiStore.getState().pushToast(t));
    for (const r of reminders) {
      await show(buildEventNotification(r, actionsOk));
      state = applyShown(state, r);
      if (!actionsOk) {
        // pas de boutons dans la notification : un toast dans l'app propose « Reporter »
        pushToast({
          message: `Rappel : « ${r.event.title} » à ${formatTimeFr(r.event.start)}`,
          actionLabel: 'Reporter',
          duration: 8000,
          onAction: () => {
            saveRappelState(snoozeOccurrence(loadRappelState(), r.key, Date.now()));
          },
        });
      }
    }
    if (tasksDue) {
      await show(buildTasksNotification(tasksDue.count, tasksDue.date));
      state = { ...state, tachesDate: tasksDue.date };
    }
  }
  (deps.saveRappelState ?? saveRappelState)(state);
  return state;
}

/** applique une action reçue (clic notification / paramètre d'URL / postMessage du SW) */
export function handleRappelAction(param: RappelParam): void {
  const pushToast = useUiStore.getState().pushToast;
  if (param.kind === 'fait') {
    saveRappelState(markOccurrenceDone(loadRappelState(), param.value));
    pushToast({ message: 'C’est noté — plus aucun rappel pour cet événement.' });
    return;
  }
  if (param.kind === 'reporter') {
    saveRappelState(snoozeOccurrence(loadRappelState(), param.value, Date.now()));
    pushToast({ message: 'Rappel reporté de 5 minutes.' });
    return;
  }
  // kind === 'voir' : ramène l'app sur Aujourd'hui et met l'événement en vedette
  if (typeof window !== 'undefined' && window.location.pathname !== '/aujourdhui') {
    window.location.assign(`/aujourdhui?rappel=voir:${encodeURIComponent(param.value)}`);
    return;
  }
  const ev = useStore.getState().events.find((e) => e.id === param.value);
  const setHighlight = useUiStore.getState().setHighlightEvent;
  if (!ev) {
    pushToast({ message: 'Cet événement n’existe plus — aucun rappel à afficher.' });
    return;
  }
  setHighlight(ev.id);
  window.setTimeout(() => useUiStore.getState().clearHighlightEvent(), HIGHLIGHT_MS);
  const today = toISODate(new Date());
  if (eventOccursOn(ev, today)) {
    pushToast({ message: `Rappel : « ${ev.title} » aujourd’hui à ${formatTimeFr(ev.start)}` });
  } else {
    pushToast({ message: `Rappel : « ${ev.title} » le ${formatDayShort(ev.date)} à ${formatTimeFr(ev.start)}` });
  }
}

/** consomme le paramètre ?rappel=… de l'URL (posé par le service worker au clic) */
export function consumeRappelParam(): void {
  if (typeof window === 'undefined') return;
  const param = parseRappelParam(window.location.search);
  if (!param) return;
  handleRappelAction(param);
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch {
    // ignore
  }
}

/**
 * Démarre le moteur : un passage immédiat, puis toutes les 30 s, au retour au premier plan
 * et au focus. Renvoie la fonction d'arrêt.
 */
export function startRappelService(): () => void {
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    consumeRappelParam();
    void runRappelTick().catch(() => undefined);
  };
  tick();
  const id = globalThis.setInterval(tick, RAPPEL_TICK_MS);
  const onVisible = () => {
    if (!stopped && typeof document !== 'undefined' && document.visibilityState === 'visible') tick();
  };
  const onFocus = () => tick();
  const onMessage = (e: MessageEvent) => {
    const d = e.data as { type?: string; action?: string; key?: string; eventId?: string } | null;
    if (!d || d.type !== 'centeryou-rappel') return;
    const kind = d.action === 'done' ? 'fait' : d.action === 'snooze' ? 'reporter' : 'voir';
    const value = kind === 'voir' ? String(d.eventId ?? '') : String(d.key ?? '');
    if (value) handleRappelAction({ kind, value });
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocus);
    window.addEventListener('message', onMessage);
  }
  return () => {
    stopped = true;
    globalThis.clearInterval(id);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('message', onMessage);
    }
  };
}


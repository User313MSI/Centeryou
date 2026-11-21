import type { Category, EventItem, Repeat } from '../types';

import { categoryLabel, CATEGORY_LIST } from './categories';

import { addDaysISO, addMonthsISO, endMinutesOf, minutesOf, pad2, timeOf } from './dates';

import { normalizeText } from './utils';

/**
 * Pont (M-07) — export / import de fichiers .ics (RFC 5545), sans aucune dépendance.
 *
 * - Export : heures FLOTTANTES (sans fuseau) — l'app travaille en heure murale locale,
 *   chaque calendrier interprétera le fichier dans son propre fuseau.
 * - Événement d'une journée (00:00 → 00:00 = minuit fin de journée) : DTSTART;VALUE=DATE.
 * - Import : parseur maison, sous-ensemble suffisant (VEVENT, SUMMARY, DTSTART, DTEND,
 *   RRULE DAILY/WEEKLY/MONTHLY + INTERVAL/UNTIL/COUNT ; BYDAY et le reste ignorés proprement).
 * - Fichier corrompu / vide / trop gros : jamais d'écran d'erreur, toujours un message FR.
 */

export const ICS_FILE_NAME = 'centeryou-export.ics';

/** plafond de taille d'un fichier importé : 1 Mo */
export const ICS_MAX_BYTES = 1024 * 1024;

/** plafond de sécurité pour la matérialisation des récurrences bornées (COUNT/UNTIL) */
export const ICS_MAX_OCCURRENCES = 366;

/** longueur max d'un titre importé (alignement sur le maxLength des champs de saisie) */
export const ICS_MAX_TITLE = 140;

export class IcsError extends Error {}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** longueur UTF-8 en octets d'un caractère (itération par point de code) */
function utf8Len(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

/** échappement RFC 5545 d'un texte (backslash, point-virgule, virgule, saut de ligne) */
export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

/** repliement d'une ligne à 75 octets max (les continuations commencent par un espace) */
export function foldIcsLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const len = utf8Len(ch);
    if (curBytes + len > 75) {
      out.push(cur);
      cur = ' ';
      curBytes = 1;
    }
    cur += ch;
    curBytes += len;
  }
  out.push(cur);
  return out;
}

function icsDate(iso: string): string {
  return iso.replace(/-/g, '');
}

/** valeur flottante YYYYMMDDTHHMMSS (heure murale locale, SANS fuseau) */
function icsDateTime(iso: string, time: string): string {
  return `${icsDate(iso)}T${time.replace(':', '')}00`;
}

/** DTSTAMP en UTC : YYYYMMDDTHHMMSSZ */
export function utcStamp(d: Date = new Date()): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

const REPEAT_TO_FREQ: Record<Exclude<Repeat, 'jamais'>, string> = {
  jour: 'DAILY',
  semaine: 'WEEKLY',
  mois: 'MONTHLY',
};

/** un événement 00:00 → 00:00 occupe toute la journée (00:00 = minuit de fin de journée) */
export function isAllDayEvent(ev: { start: string; end: string }): boolean {
  return ev.start === '00:00' && ev.end === '00:00';
}

export function eventToIcsLines(ev: EventItem, stamp: string): string[] {
  const lines: string[] = ['BEGIN:VEVENT', `UID:${ev.id}@centeryou`, `DTSTAMP:${stamp}`, `SUMMARY:${escapeIcsText(ev.title)}`];
  if (isAllDayEvent(ev)) {
    // journée entière : DTSTART;VALUE=DATE, DTEND exclusif le lendemain
    lines.push(`DTSTART;VALUE=DATE:${icsDate(ev.date)}`);
    lines.push(`DTEND;VALUE=DATE:${icsDate(addDaysISO(ev.date, 1))}`);
  } else {
    lines.push(`DTSTART:${icsDateTime(ev.date, ev.start)}`);
    // fin « 00:00 » = minuit de fin de journée : on écrit le lendemain à 00:00 (durée positive côté .ics)
    const endDate = ev.end === '00:00' ? addDaysISO(ev.date, 1) : ev.date;
    lines.push(`DTEND:${icsDateTime(endDate, ev.end)}`);
  }
  if (ev.repeat !== 'jamais') lines.push(`RRULE:FREQ=${REPEAT_TO_FREQ[ev.repeat]}`);
  lines.push(`DESCRIPTION:${escapeIcsText(`Catégorie : ${categoryLabel(ev.category)}`)}`);
  lines.push('END:VEVENT');
  return lines;
}

/** construit le fichier .ics complet (fins de ligne CRLF, UTF-8 intact) */
export function buildIcs(events: EventItem[], stamp: string = utcStamp()): string {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.createdAt - b.createdAt);
  const raw = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Centeryou//Centeryou//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Centeryou',
    ...sorted.flatMap((ev) => eventToIcsLines(ev, stamp)),
    'END:VCALENDAR',
  ];
  return `${raw.flatMap(foldIcsLine).join('\r\n')}\r\n`;
}

/** télécharge le fichier .ics dans le navigateur */
export function downloadIcs(ics: string, fileName: string = ICS_FILE_NAME): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Import — parseur maison
// ---------------------------------------------------------------------------

/** candidat prêt à entrer dans le store (id/createdAt seront posés par le store) */
export interface IcsCandidate {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm — « 00:00 » = minuit de fin de journée */
  end: string;
  category: Category;
  repeat: Repeat;
}

export interface IcsRefus {
  titre: string;
  raison: string;
}

export interface IcsParseResult {
  candidats: IcsCandidate[];
  refuses: IcsRefus[];
  /** messages d'information pour le compte-rendu (règles ignorées, troncatures…) */
  notes: string[];
  /** nombre de VEVENT lus dans le fichier */
  detectes: number;
}

interface IcsProp {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** retire les caractères de contrôle dangereux (on garde \n et \t) */
function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** un-échappement RFC 5545 : \\ \; \, \n (et \N) */
export function unescapeIcsText(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === 'n' || n === 'N') out += '\n';
      else out += n; // \\ \; \, et toute autre séquence : on garde le caractère
      i += 1;
      continue;
    }
    out += c;
  }
  return stripControlChars(out);
}

/** déplie les lignes de continuation (CRLF + espace/tab) et retire le BOM */
export function unfoldIcs(text: string): string[] {
  const raw = text.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
  const lines: string[] = [];
  for (const l of raw) {
    if ((l.startsWith(' ') || l.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += l.slice(1);
    } else {
      lines.push(l);
    }
  }
  return lines;
}

function parseIcsProp(line: string): IcsProp | null {
  const idx = line.indexOf(':');
  if (idx <= 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const parts = left.split(';');
  const name = parts[0].trim().toUpperCase();
  if (!name) return null;
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).trim().toUpperCase()] = p.slice(eq + 1).trim().toUpperCase();
  }
  return { name, params, value };
}

interface IcsDateValue {
  date: string;
  /** null = journée entière (VALUE=DATE) */
  time: string | null;
}

/** lit une valeur DTSTART/DTEND : date seule, ou date-heure flottante, ou UTC (Z) */
export function parseIcsDateValue(value: string, params: Record<string, string>): IcsDateValue | null {
  const v = value.trim();
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
    if (!m) return null;
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return { date: `${y}-${m[2]}-${m[3]}`, time: null };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/.exec(v);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const h = +m[4];
  const mi = +m[5];
  const s = m[6] ? +m[6] : 0;
  const zulu = m[7] === 'Z';
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const check = new Date(y, mo - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== mo - 1 || check.getDate() !== d) return null;
  if (zulu) {
    // instant UTC → heure murale locale de l'appareil
    const u = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
    return { date: `${u.getFullYear()}-${pad2(u.getMonth() + 1)}-${pad2(u.getDate())}`, time: `${pad2(u.getHours())}:${pad2(u.getMinutes())}` };
  }
  return { date: `${y}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
}

interface IcsRrule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
  interval: number;
  /** YYYY-MM-DD inclus, ou null */
  until: string | null;
  count: number | null;
  ignores: string[];
}

const FREQ_TO_REPEAT: Record<string, Repeat> = {
  DAILY: 'jour',
  WEEKLY: 'semaine',
  MONTHLY: 'mois',
};

function parseRrule(value: string): IcsRrule {
  const rule: IcsRrule = { freq: null, interval: 1, until: null, count: null, ignores: [] };
  for (const part of value.split(';')) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf('=');
    if (eq <= 0) {
      rule.ignores.push(p);
      continue;
    }
    const k = p.slice(0, eq).toUpperCase();
    const v = p.slice(eq + 1).trim();
    if (k === 'FREQ') {
      const f = v.toUpperCase();
      if (f === 'DAILY' || f === 'WEEKLY' || f === 'MONTHLY') rule.freq = f;
      else rule.ignores.push(`FREQ=${v}`);
    } else if (k === 'INTERVAL') {
      const n = Number.parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) rule.interval = n;
      else rule.ignores.push(`INTERVAL=${v}`);
    } else if (k === 'UNTIL') {
      const m = /^(\d{4})(\d{2})(\d{2})/.exec(v);
      if (m) rule.until = `${m[1]}-${m[2]}-${m[3]}`;
      else rule.ignores.push(`UNTIL=${v}`);
    } else if (k === 'COUNT') {
      const n = Number.parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) rule.count = n;
      else rule.ignores.push(`COUNT=${v}`);
    } else {
      // BYDAY, BYMONTH, WKST, BYSETPOS… : ignorés proprement
      rule.ignores.push(p);
    }
  }
  return rule;
}

/** matérialise les dates d'une récurrence bornée (COUNT/UNTIL/INTERVAL>1) */
function expandDates(startISO: string, rule: IcsRrule): { dates: string[]; tronque: boolean } {
  const dates: string[] = [];
  let d = startISO;
  while (dates.length < ICS_MAX_OCCURRENCES) {
    if (rule.until && d > rule.until) break;
    dates.push(d);
    if (rule.count && dates.length >= rule.count) break;
    if (rule.freq === 'DAILY') d = addDaysISO(d, rule.interval);
    else if (rule.freq === 'WEEKLY') d = addDaysISO(d, 7 * rule.interval);
    else if (rule.freq === 'MONTHLY') d = addMonthsISO(d, rule.interval);
    else break;
  }
  const borne = rule.count !== null || rule.until !== null;
  const tronque = !borne && dates.length >= ICS_MAX_OCCURRENCES;
  return { dates, tronque };
}

/** retrouve la catégorie Centeryou depuis la description « Catégorie : … » */
function categoryFromDescription(desc: string | undefined): Category {
  if (!desc) return 'autre';
  const m = /cat[ée]gorie\s*:\s*(.+)$/i.exec(desc.trim());
  const label = m ? m[1].trim() : desc.trim();
  const found = CATEGORY_LIST.find((c) => normalizeText(c.label) === normalizeText(label) || c.id === normalizeText(label));
  return found ? found.id : 'autre';
}

/**
 * Parse un fichier .ics. Lance une IcsError (message FR) si le fichier est
 * illisible, vide, ou n'est pas un calendrier. Les événements impossibles à
 * représenter sont placés dans `refuses` (jamais une exception).
 */
export function parseIcs(text: string): IcsParseResult {
  if (!text || text.trim() === '') {
    throw new IcsError('Ce fichier est vide : il ne contient aucun calendrier à importer.');
  }
  const lines = unfoldIcs(text);
  const first = lines.find((l) => l.trim() !== '');
  if (!first || first.trim().toUpperCase() !== 'BEGIN:VCALENDAR') {
    throw new IcsError("Ce fichier ne ressemble pas à un calendrier .ics valide (il doit commencer par « BEGIN:VCALENDAR »). Aucune donnée n'a été modifiée.");
  }

  const candidats: IcsCandidate[] = [];
  const refuses: IcsRefus[] = [];
  const notes: string[] = [];
  const ignoresRules = new Set<string>();
  let detectes = 0;
  let tzidVu = false;
  let titresTronques = 0;

  let inEvent = false;
  let skipOther = 0; // profondeur des composants ignorés (VTIMEZONE, VTODO…)
  let props: IcsProp[] = [];

  const flushEvent = () => {
    if (!props.length) return;
    const get = (n: string) => props.find((p) => p.name === n);
    let titre = get('SUMMARY') ? unescapeIcsText(get('SUMMARY')!.value).trim() : '';
    if (!titre) titre = 'Événement importé';
    if (titre.length > ICS_MAX_TITLE) {
      titre = titre.slice(0, ICS_MAX_TITLE);
      titresTronques += 1;
    }
    const dtstart = get('DTSTART');
    if (!dtstart) {
      refuses.push({ titre, raison: "il n'a pas de date de début — ignoré" });
      return;
    }
    if (dtstart.params.TZID) tzidVu = true;
    const start = parseIcsDateValue(dtstart.value, dtstart.params);
    if (!start) {
      refuses.push({ titre, raison: 'sa date de début est illisible — ignoré' });
      return;
    }
    const dtend = get('DTEND');
    let endVal: IcsDateValue | null = null;
    if (dtend) {
      if (dtend.params.TZID) tzidVu = true;
      endVal = parseIcsDateValue(dtend.value, dtend.params);
      if (!endVal) {
        refuses.push({ titre, raison: 'sa date de fin est illisible — ignoré' });
        return;
      }
    }
    const category = categoryFromDescription(get('DESCRIPTION') ? unescapeIcsText(get('DESCRIPTION')!.value) : undefined);

    // --- journée entière (VALUE=DATE) ---
    if (start.time === null) {
      if (endVal && endVal.time !== null) {
        refuses.push({ titre, raison: 'son format de dates est incohérent — ignoré' });
        return;
      }
      if (endVal && endVal.date > addDaysISO(start.date, 1)) {
        refuses.push({ titre, raison: "il s'étend sur plusieurs jours entiers — Centeryou ne gère qu'une journée à la fois, il est ignoré" });
        return;
      }
      candidats.push(...applyRule(titre, start.date, '00:00', '00:00', category, get('RRULE'), notes, ignoresRules));
      return;
    }

    // --- événement horé ---
    if (endVal && endVal.time === null) {
      refuses.push({ titre, raison: 'son format de dates est incohérent — ignoré' });
      return;
    }
    let endTime: string;
    if (!endVal) {
      endTime = timeOf(minutesOf(start.time) + 60); // durée par défaut : 1 h
    } else if (endVal.date === start.date) {
      if (endMinutesOf(endVal.time!) <= minutesOf(start.time)) {
        refuses.push({ titre, raison: "son heure de fin n'est pas après son heure de début — ignoré" });
        return;
      }
      endTime = endVal.time!;
    } else if (endVal.date === addDaysISO(start.date, 1) && endVal.time === '00:00') {
      endTime = '00:00'; // minuit de fin de journée (24h00)
    } else {
      refuses.push({
        titre,
        raison: "il traverse minuit (fin le lendemain) — Centeryou ne représente pas encore les événements de nuit, il est ignoré",
      });
      return;
    }
    candidats.push(...applyRule(titre, start.date, start.time, endTime, category, get('RRULE'), notes, ignoresRules));
  };

  for (const line of lines) {
    const prop = parseIcsProp(line);
    const upper = line.trim().toUpperCase();
    if (!prop) continue;
    if (prop.name === 'BEGIN') {
      const comp = prop.value.trim().toUpperCase();
      if (skipOther > 0) {
        skipOther += 1;
      } else if (comp === 'VEVENT') {
        inEvent = true;
        props = [];
        detectes += 1;
      } else if (comp !== 'VCALENDAR') {
        skipOther = 1; // VTIMEZONE, VTODO, VALARM… : on saute tout le bloc
      }
      continue;
    }
    if (prop.name === 'END') {
      const comp = prop.value.trim().toUpperCase();
      if (skipOther > 0) {
        skipOther -= 1;
      } else if (comp === 'VEVENT' && inEvent) {
        inEvent = false;
        flushEvent();
        props = [];
      }
      continue;
    }
    if (inEvent && skipOther === 0) props.push(prop);
  }

  if (detectes === 0) {
    throw new IcsError("Ce fichier est bien un calendrier .ics, mais il ne contient aucun événement : rien à importer. Aucune donnée n'a été modifiée.");
  }
  if (titresTronques > 0) notes.push(`${titresTronques} titre${titresTronques > 1 ? 's trop longs ont' : ' trop long a'} été raccourci${titresTronques > 1 ? 's' : ''} à ${ICS_MAX_TITLE} caractères.`);
  if (ignoresRules.size > 0) notes.push(`Règles de répétition avancées ignorées (${Array.from(ignoresRules).join(', ')}) : les occurrences concernées suivent la règle principale.`);
  if (tzidVu) notes.push('Les fuseaux horaires du fichier (TZID) ont été ignorés : les heures sont lues telles quelles, en heure locale.');

  return { candidats, refuses, notes, detectes };
}

/** applique la RRULE : répétition native si simple, sinon matérialisation des occurrences */
function applyRule(
  titre: string,
  startDate: string,
  start: string,
  end: string,
  category: Category,
  rruleProp: IcsProp | undefined,
  notes: string[],
  ignoresRules: Set<string>,
): IcsCandidate[] {
  if (!rruleProp) return [{ title: titre, date: startDate, start, end, category, repeat: 'jamais' }];
  const rule = parseRrule(rruleProp.value);
  for (const ig of rule.ignores) ignoresRules.add(ig);
  if (!rule.freq) {
    notes.push(`« ${titre} » : sa règle de répétition (${rruleProp.value}) n'est pas reconnue — importé sans répétition.`);
    return [{ title: titre, date: startDate, start, end, category, repeat: 'jamais' }];
  }
  if (rule.interval === 1 && !rule.until && !rule.count) {
    // cas natif : la répétition de l'app couvre exactement DAILY/WEEKLY/MONTHLY
    return [{ title: titre, date: startDate, start, end, category, repeat: FREQ_TO_REPEAT[rule.freq] }];
  }
  const { dates, tronque } = expandDates(startDate, rule);
  if (tronque) notes.push(`« ${titre} » : répétition très longue limitée à ${dates.length} occurrences.`);
  return dates.map((date) => ({ title: titre, date, start, end, category, repeat: 'jamais' as Repeat }));
}

// ---------------------------------------------------------------------------
// Doublons + lecture fichier
// ---------------------------------------------------------------------------

/** clé de doublon : titre + date + heure identiques */
export function eventKey(c: { title: string; date: string; start: string; end: string }): string {
  return `${c.title.trim()}␟${c.date}␟${c.start}␟${c.end}`;
}

/**
 * Découpe ce qui sera importé : avec « ignorer les doublons », tout candidat
 * identique (titre + date + début + fin) à un événement existant ou déjà retenu
 * dans ce fichier est compté en doublon.
 */
export function planImport(
  result: IcsParseResult,
  existants: Array<Pick<EventItem, 'title' | 'date' | 'start' | 'end'>>,
  ignorerDoublons: boolean,
): { aImporter: IcsCandidate[]; doublons: number } {
  const seen = new Set(existants.map(eventKey));
  const aImporter: IcsCandidate[] = [];
  let doublons = 0;
  for (const c of result.candidats) {
    const k = eventKey(c);
    if (ignorerDoublons && seen.has(k)) {
      doublons += 1;
      continue;
    }
    seen.add(k);
    aImporter.push(c);
  }
  return { aImporter, doublons };
}

/** lit un fichier .ics choisi par l'utilisateur (plafond 1 Mo, message FR sinon) */
export function readIcsFile(file: Blob): Promise<string> {
  if (file.size > ICS_MAX_BYTES) {
    const mo = (file.size / ICS_MAX_BYTES).toFixed(1).replace('.', ',');
    return Promise.reject(
      new IcsError(`Ce fichier est trop volumineux (${mo} Mo) : la limite est de 1 Mo. Aucune donnée n'a été modifiée.`),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new IcsError('Impossible de lire ce fichier .ics. Réessaie avec un autre fichier.'));
    reader.readAsText(file, 'UTF-8');
  });
}

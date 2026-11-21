import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventItem } from '../src/types';

import {
  buildIcs,
  downloadIcs,
  escapeIcsText,
  eventKey,
  foldIcsLine,
  ICS_FILE_NAME,
  ICS_MAX_BYTES,
  IcsError,
  isAllDayEvent,
  parseIcs,
  parseIcsDateValue,
  planImport,
  readIcsFile,
  unfoldIcs,
  unescapeIcsText,
  utcStamp,
  type IcsParseResult,
} from '../src/lib/ics';

import { pad2 } from '../src/lib/dates';

import { defaultSettings } from '../src/lib/defaults';

import { useStore } from '../src/lib/store';

const CRLF = '\r\n';

function vevent(inner: string): string {
  return `BEGIN:VEVENT${CRLF}${inner}${CRLF}END:VEVENT${CRLF}`;
}

function calendar(...blocks: string[]): string {
  return `BEGIN:VCALENDAR${CRLF}VERSION:2.0${CRLF}PRODID:-//Test//Test//FR${CRLF}${blocks.join('')}END:VCALENDAR${CRLF}`;
}

function bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

const ev = (over: Partial<EventItem> = {}): EventItem => ({
  id: 'e1',
  title: 'Sport',
  date: '2025-01-07',
  start: '14:00',
  end: '15:00',
  category: 'perso',
  repeat: 'jamais',
  createdAt: 1,
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
  useStore.setState({ events: [], tasks: [], settings: { ...defaultSettings }, hydrated: true });
});

describe('export .ics (RFC 5545)', () => {
  it('fins de ligne CRLF partout, structure VCALENDAR complète', () => {
    const ics = buildIcs([ev()], '20250101T000000Z');
    expect(ics.startsWith(`BEGIN:VCALENDAR${CRLF}`)).toBe(true);
    expect(ics.endsWith(`END:VCALENDAR${CRLF}`)).toBe(true);
    expect(ics).toContain(`VERSION:2.0${CRLF}`);
    expect(ics).toContain(`PRODID:-//Centeryou//Centeryou//FR${CRLF}`);
    expect(ics).toContain(`UID:e1@centeryou${CRLF}`);
    expect(ics).toContain(`DTSTAMP:20250101T000000Z${CRLF}`);
    // aucun LF seul
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics).not.toContain('\r\r');
  });

  it('heures flottantes (sans fuseau) : DTSTART:20250107T140000', () => {
    const ics = buildIcs([ev()], '20250101T000000Z');
    expect(ics).toContain(`DTSTART:20250107T140000${CRLF}`);
    expect(ics).toContain(`DTEND:20250107T150000${CRLF}`);
    expect(ics).not.toContain('Z\r\nDTEND');
  });

  it('fin « 00:00 » (minuit de fin de journée) écrite le lendemain à 00:00', () => {
    const ics = buildIcs([ev({ start: '23:00', end: '00:00' })], '20250101T000000Z');
    expect(ics).toContain(`DTSTART:20250107T230000${CRLF}`);
    expect(ics).toContain(`DTEND:20250108T000000${CRLF}`);
  });

  it('échappement des virgules, points-virgules, backslashes et sauts de ligne', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const ics = buildIcs([ev({ title: 'Réunion, équipe ; back\\slash\nligne 2' })], '20250101T000000Z');
    expect(ics).toContain('SUMMARY:Réunion\\, équipe \\; back\\\\slash\\nligne 2');
  });

  it('accents UTF-8 intacts, lignes repliées à 75 octets sans couper un caractère', () => {
    const titre = `Événement très long avec accents é ç à ü — ${'x'.repeat(90)}ééé`;
    const ics = buildIcs([ev({ title: titre })], '20250101T000000Z');
    for (const line of ics.split(CRLF)) {
      expect(bytes(line)).toBeLessThanOrEqual(75);
    }
    // le repliage ne casse pas le texte : aller-retour identique
    expect(parseIcs(ics).candidats[0].title).toBe(titre);
  });

  it('foldIcsLine : chaque ligne ≤ 75 octets, les continuations commencent par un espace', () => {
    const lines = foldIcsLine(`SUMMARY:${'é'.repeat(60)}`);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(bytes(l)).toBeLessThanOrEqual(75);
    for (const l of lines.slice(1)) expect(l.startsWith(' ')).toBe(true);
  });

  it('événement d’une journée : DTSTART;VALUE=DATE + DTEND exclusif le lendemain', () => {
    expect(isAllDayEvent({ start: '00:00', end: '00:00' })).toBe(true);
    const ics = buildIcs([ev({ start: '00:00', end: '00:00', date: '2025-01-10' })], '20250101T000000Z');
    expect(ics).toContain(`DTSTART;VALUE=DATE:20250110${CRLF}`);
    expect(ics).toContain(`DTEND;VALUE=DATE:20250111${CRLF}`);
  });

  it('RRULE : chaque jour → DAILY, chaque semaine → WEEKLY, chaque mois → MONTHLY, jamais → rien', () => {
    expect(buildIcs([ev({ repeat: 'jour' })])).toContain(`RRULE:FREQ=DAILY${CRLF}`);
    expect(buildIcs([ev({ repeat: 'semaine' })])).toContain(`RRULE:FREQ=WEEKLY${CRLF}`);
    expect(buildIcs([ev({ repeat: 'mois' })])).toContain(`RRULE:FREQ=MONTHLY${CRLF}`);
    expect(buildIcs([ev({ repeat: 'jamais' })])).not.toContain('RRULE');
  });

  it('catégorie en description', () => {
    const ics = buildIcs([ev({ category: 'travail' })], '20250101T000000Z');
    expect(ics).toContain(`DESCRIPTION:Catégorie : Travail${CRLF}`);
  });

  it('nom de fichier et plafond de taille', () => {
    expect(ICS_FILE_NAME).toBe('centeryou-export.ics');
    expect(ICS_MAX_BYTES).toBe(1024 * 1024);
  });

  it('utcStamp au format RFC (UTC)', () => {
    expect(utcStamp(new Date(Date.UTC(2026, 10, 21, 7, 8, 9)))).toBe('20261121T070809Z');
  });

  it('downloadIcs : blob text/calendar UTF-8 et nom de fichier centeryou-export.ics', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    let anchor: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      anchor = this;
    });
    downloadIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(anchor).not.toBeNull();
    expect(anchor!.download).toBe('centeryou-export.ics');
    createObjectURL.mockRestore();
  });
});

describe('import .ics — aller-retour export → import identique', () => {
  it('round-trip fidèle (accents, échappements, all-day, 3 fréquences, catégories, minuit)', () => {
    const events: EventItem[] = [
      ev({ id: 'e1', title: 'Réunion, équipe ; projet', date: '2025-01-07', start: '14:00', end: '15:00', category: 'travail', repeat: 'semaine' }),
      ev({ id: 'e2', title: 'Ligne1\nLigne2 — é ç à \\ back', date: '2025-01-08', start: '09:00', end: '00:00', category: 'perso', repeat: 'jamais' }),
      ev({ id: 'e3', title: 'Journée portes ouvertes', date: '2025-01-10', start: '00:00', end: '00:00', category: 'autre', repeat: 'mois' }),
      ev({ id: 'e4', title: 'Sport du matin', date: '2025-01-11', start: '07:30', end: '08:30', category: 'sante', repeat: 'jour' }),
    ];
    const ics = buildIcs(events, '20250101T000000Z');
    const parsed = parseIcs(ics);
    expect(parsed.detectes).toBe(4);
    expect(parsed.refuses).toEqual([]);
    const got = parsed.candidats.map((c) => ({
      title: c.title,
      date: c.date,
      start: c.start,
      end: c.end,
      category: c.category,
      repeat: c.repeat,
    }));
    expect(got).toEqual(
      events.map((e) => ({ title: e.title, date: e.date, start: e.start, end: e.end, category: e.category, repeat: e.repeat })),
    );
  });
});

describe('import .ics — parseur maison', () => {
  it('VEVENT simple flottant : SUMMARY, DTSTART, DTEND', () => {
    const r = parseIcs(calendar(vevent(`UID:a@x${CRLF}DTSTAMP:20250101T000000Z${CRLF}SUMMARY:Dentiste${CRLF}DTSTART:20250108T103000${CRLF}DTEND:20250108T110000`)));
    expect(r.detectes).toBe(1);
    expect(r.candidats).toEqual([{ title: 'Dentiste', date: '2025-01-08', start: '10:30', end: '11:00', category: 'autre', repeat: 'jamais' }]);
  });

  it('VALUE=DATE (journée entière) → 00:00 → 00:00', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:Vacances${CRLF}DTSTART;VALUE=DATE:20250214${CRLF}DTEND;VALUE=DATE:20250215`)));
    expect(r.candidats[0]).toMatchObject({ title: 'Vacances', date: '2025-02-14', start: '00:00', end: '00:00' });
  });

  it('VALUE=DATE sur plusieurs jours → refusé avec une raison claire', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:Vacances${CRLF}DTSTART;VALUE=DATE:20250214${CRLF}DTEND;VALUE=DATE:20250218`)));
    expect(r.candidats).toEqual([]);
    expect(r.refuses[0].raison).toMatch(/plusieurs jours/);
  });

  it('valeur UTC (Z) convertie en heure locale ; TZID ignoré proprement avec une note', () => {
    const z = parseIcsDateValue('20250610T120000Z', {});
    const expected = new Date(Date.UTC(2025, 5, 10, 12, 0, 0));
    expect(z).toEqual({
      date: `${expected.getFullYear()}-${pad2(expected.getMonth() + 1)}-${pad2(expected.getDate())}`,
      time: `${pad2(expected.getHours())}:${pad2(expected.getMinutes())}`,
    });
    const r = parseIcs(calendar(vevent(`SUMMARY:Rdv${CRLF}DTSTART;TZID=Europe/Paris:20250610T140000${CRLF}DTEND;TZID=Europe/Paris:20250610T150000`)));
    expect(r.candidats[0]).toMatchObject({ date: '2025-06-10', start: '14:00', end: '15:00' });
    expect(r.notes.some((n) => n.includes('TZID'))).toBe(true);
  });

  it('DTEND absent → durée par défaut d’une heure', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:Rdv${CRLF}DTSTART:20250610T140000`)));
    expect(r.candidats[0]).toMatchObject({ start: '14:00', end: '15:00' });
  });

  it('SUMMARY absent → titre par défaut ; caractères de contrôle retirés', () => {
    const r = parseIcs(calendar(vevent(`DTSTART:20250610T140000${CRLF}DTEND:20250610T150000${CRLF}SUMMARY:  `)));
    expect(r.candidats[0].title).toBe('Événement importé');
    const r2 = parseIcs(calendar(vevent(`SUMMARY:abc${CRLF}DTSTART:20250610T140000${CRLF}DTEND:20250610T150000`.replace('abc', 'a\u0000b\u0007c'))));
    expect(r2.candidats[0].title).toBe('abc');
  });

  it('lignes repliées (continuation « espace ») correctement dépliées', () => {
    const long = 'A'.repeat(100);
    const folded = `SUMMARY:${long.slice(0, 70)}${CRLF} ${long.slice(70)}`;
    const r = parseIcs(calendar(vevent(`${folded}${CRLF}DTSTART:20250610T140000${CRLF}DTEND:20250610T150000`)));
    expect(r.candidats[0].title).toBe(long);
    expect(unfoldIcs(`a${CRLF} b${CRLF}\tc`)).toEqual(['abc']);
  });

  it('un bloc VTIMEZONE (avec ses DTSTART) n’est pas pris pour un événement', () => {
    const tz = `BEGIN:VTIMEZONE${CRLF}TZID:Europe/Paris${CRLF}BEGIN:STANDARD${CRLF}DTSTART:19701025T030000${CRLF}END:STANDARD${CRLF}END:VTIMEZONE${CRLF}`;
    const r = parseIcs(calendar(tz + vevent(`SUMMARY:Rdv${CRLF}DTSTART:20250610T140000${CRLF}DTEND:20250610T150000`)));
    expect(r.detectes).toBe(1);
    expect(r.candidats).toHaveLength(1);
    expect(r.refuses).toEqual([]);
  });

  it('catégorie retrouvée depuis la description (« Catégorie : Santé »)', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:Consultation${CRLF}DESCRIPTION:Catégorie : Santé${CRLF}DTSTART:20250610T140000${CRLF}DTEND:20250610T150000`)));
    expect(r.candidats[0].category).toBe('sante');
  });
});

describe('import .ics — RRULE', () => {
  const base = `SUMMARY:Sport${CRLF}DTSTART:20250106T070000${CRLF}DTEND:20250106T080000${CRLF}`;

  it('FREQ=DAILY / WEEKLY / MONTHLY simples → répétition native de l’app', () => {
    expect(parseIcs(calendar(vevent(`${base}RRULE:FREQ=DAILY`))).candidats[0].repeat).toBe('jour');
    expect(parseIcs(calendar(vevent(`${base}RRULE:FREQ=WEEKLY`))).candidats[0].repeat).toBe('semaine');
    expect(parseIcs(calendar(vevent(`${base}RRULE:FREQ=MONTHLY`))).candidats[0].repeat).toBe('mois');
  });

  it('COUNT=3 → 3 occurrences matérialisées (repeat « jamais »), dans l’ordre', () => {
    const r = parseIcs(calendar(vevent(`${base}RRULE:FREQ=DAILY;COUNT=3`)));
    expect(r.candidats.map((c) => c.date)).toEqual(['2025-01-06', '2025-01-07', '2025-01-08']);
    expect(r.candidats.every((c) => c.repeat === 'jamais' && c.start === '07:00' && c.end === '08:00')).toBe(true);
  });

  it('UNTIL borne la récurrence (inclus)', () => {
    const r = parseIcs(calendar(vevent(`${base}RRULE:FREQ=DAILY;UNTIL=20250108`)));
    expect(r.candidats.map((c) => c.date)).toEqual(['2025-01-06', '2025-01-07', '2025-01-08']);
  });

  it('INTERVAL=2 (WEEKLY) → occurrences espacées de 2 semaines', () => {
    const r = parseIcs(calendar(vevent(`${base}RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3`)));
    expect(r.candidats.map((c) => c.date)).toEqual(['2025-01-06', '2025-01-20', '2025-02-03']);
  });

  it('MONTHLY avec UNTIL en datetime (…T235959Z) : partie date seule retenue', () => {
    const r = parseIcs(calendar(vevent(`${base}RRULE:FREQ=MONTHLY;UNTIL=20250306T235959Z`)));
    expect(r.candidats.map((c) => c.date)).toEqual(['2025-01-06', '2025-02-06', '2025-03-06']);
  });

  it('BYDAY et compagnie ignorés proprement + mentionnés dans les notes', () => {
    const r = parseIcs(calendar(vevent(`${base}RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR`)));
    expect(r.candidats).toHaveLength(1);
    expect(r.candidats[0].repeat).toBe('semaine');
    expect(r.notes.some((n) => n.includes('BYDAY=MO,WE,FR'))).toBe(true);
  });

  it('FREQ inconnu (YEARLY) → importé sans répétition + note', () => {
    const r = parseIcs(calendar(vevent(`${base}RRULE:FREQ=YEARLY`)));
    expect(r.candidats[0].repeat).toBe('jamais');
    expect(r.notes.some((n) => n.includes('FREQ=YEARLY'))).toBe(true);
  });

  it('récurrence non bornée avec INTERVAL>1 → plafonnée à 366 occurrences + note', () => {
    const r = parseIcs(calendar(vevent(`${base}RRULE:FREQ=DAILY;INTERVAL=2`)));
    expect(r.candidats).toHaveLength(366);
    expect(r.notes.some((n) => n.includes('366'))).toBe(true);
  });
});

describe('import .ics — refus propres et fichiers ingérables', () => {
  it('fichier corrompu → IcsError en français, jamais de crash', () => {
    expect(() => parseIcs('ceci n’est pas un calendrier {{{')).toThrow(IcsError);
    expect(() => parseIcs('ceci n’est pas un calendrier {{{')).toThrow(/BEGIN:VCALENDAR/);
  });

  it('fichier vide → IcsError « vide »', () => {
    expect(() => parseIcs('')).toThrow(/vide/);
    expect(() => parseIcs('   \r\n  ')).toThrow(/vide/);
  });

  it('VCALENDAR sans aucun VEVENT → IcsError « aucun événement »', () => {
    expect(() => parseIcs(calendar())).toThrow(/aucun événement/);
  });

  it('VEVENT sans DTSTART → refusé (incomplet)', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:Sans date`)));
    expect(r.candidats).toEqual([]);
    expect(r.refuses[0]).toMatchObject({ titre: 'Sans date' });
    expect(r.refuses[0].raison).toMatch(/date de début/);
  });

  it('date illisible → refusé', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:X${CRLF}DTSTART:20251340T999999${CRLF}DTEND:20251341T100000`)));
    expect(r.refuses[0].raison).toMatch(/illisible/);
    const r2 = parseIcs(calendar(vevent(`SUMMARY:X${CRLF}DTSTART:20250230T100000${CRLF}DTEND:20250230T110000`)));
    expect(r2.refuses[0].raison).toMatch(/illisible/);
  });

  it('événement qui traverse minuit (fin le lendemain à 2h) → refusé avec compte-rendu honnête', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:Soirée${CRLF}DTSTART:20250110T230000${CRLF}DTEND:20250111T020000`)));
    expect(r.candidats).toEqual([]);
    expect(r.refuses[0].titre).toBe('Soirée');
    expect(r.refuses[0].raison).toMatch(/traverse minuit/);
    expect(r.refuses[0].raison).toMatch(/événements de nuit/);
  });

  it('fin à 00:00 le lendemain = minuit de fin de journée → accepté (end « 00:00 »)', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:Veille${CRLF}DTSTART:20250110T230000${CRLF}DTEND:20250111T000000`)));
    expect(r.candidats[0]).toMatchObject({ date: '2025-01-10', start: '23:00', end: '00:00' });
    expect(r.refuses).toEqual([]);
  });

  it('fin avant le début le même jour → refusé', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:X${CRLF}DTSTART:20250110T150000${CRLF}DTEND:20250110T140000`)));
    expect(r.refuses[0].raison).toMatch(/heure de fin/);
  });

  it('titre trop long → tronqué à 140 caractères + note', () => {
    const r = parseIcs(calendar(vevent(`SUMMARY:${'a'.repeat(200)}${CRLF}DTSTART:20250110T150000${CRLF}DTEND:20250110T160000`)));
    expect(r.candidats[0].title).toHaveLength(140);
    expect(r.notes.some((n) => n.includes('140'))).toBe(true);
  });

  it('readIcsFile refuse un fichier de plus de 1 Mo avec un message clair', async () => {
    const gros = new File([new Uint8Array(ICS_MAX_BYTES + 1)], 'gros.ics', { type: 'text/calendar' });
    await expect(readIcsFile(gros)).rejects.toThrow(/trop volumineux/);
    await expect(readIcsFile(gros)).rejects.toThrow(/1 Mo/);
  });

  it('readIcsFile lit un fichier valide', async () => {
    const f = new File([calendar(vevent(`SUMMARY:X${CRLF}DTSTART:20250110T150000${CRLF}DTEND:20250110T160000`))], 'a.ics', { type: 'text/calendar' });
    const txt = await readIcsFile(f);
    expect(txt).toContain('BEGIN:VCALENDAR');
  });
});

describe('import .ics — doublons', () => {
  it('eventKey : titre + date + heure identiques', () => {
    expect(eventKey({ title: ' Sport ', date: '2025-01-07', start: '14:00', end: '15:00' })).toBe(
      eventKey({ title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00' }),
    );
    expect(eventKey({ title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00' })).not.toBe(
      eventKey({ title: 'Sport', date: '2025-01-08', start: '14:00', end: '15:00' }),
    );
  });

  it('planImport : doublons ignorés contre les existants ET dans le fichier lui-même', () => {
    const result: IcsParseResult = {
      detectes: 3,
      refuses: [],
      notes: [],
      candidats: [
        { title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00', category: 'perso', repeat: 'jamais' },
        { title: 'Sport', date: '2025-01-07', start: '14:00', end: '15:00', category: 'perso', repeat: 'jamais' },
        { title: 'Dentiste', date: '2025-01-08', start: '10:30', end: '11:00', category: 'sante', repeat: 'jamais' },
      ],
    };
    const existants = [ev()]; // Sport 2025-01-07 14:00–15:00
    const avec = planImport(result, existants, true);
    expect(avec.aImporter).toHaveLength(1);
    expect(avec.aImporter[0].title).toBe('Dentiste');
    expect(avec.doublons).toBe(2);
    const sans = planImport(result, existants, false);
    expect(sans.aImporter).toHaveLength(3);
    expect(sans.doublons).toBe(0);
  });
});

describe('import .ics — store (ajout, jamais d’écrasement, sanitize item par item)', () => {
  it('importEvents ajoute à la liste existante et sanitize chaque élément', () => {
    useStore.getState().addEvent({ title: 'Existant', date: '2025-01-05', start: '10:00', end: '11:00', category: 'autre', repeat: 'jamais' });
    const ajoutes = useStore.getState().importEvents([
      { title: 'Nouveau', date: '2025-01-07', start: '14:00', end: '15:00', category: 'perso', repeat: 'jour' },
      // élément invalide (catégorie inconnue) : écarté par le sanitizer, n’entre pas dans le store
      { title: 'Casse', date: '2025-01-07', start: '14:00', end: '15:00', category: 'hack' as never, repeat: 'jamais' },
    ]);
    expect(ajoutes).toHaveLength(1);
    const events = useStore.getState().events;
    expect(events.map((e) => e.title)).toEqual(['Existant', 'Nouveau']);
    expect(events[1].id).toBeTruthy();
    expect(events[1].repeat).toBe('jour');
  });
});

describe('unescape / escape', () => {
  it('aller-retour sur les caractères spéciaux RFC 5545', () => {
    const s = 'a,b;c\\d\ne\nf';
    expect(unescapeIcsText(escapeIcsText(s))).toBe(s);
  });
});

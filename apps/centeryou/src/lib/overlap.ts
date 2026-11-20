import { endMinutesOf, minutesOf } from './dates';

/**
 * Mise en colonnes des éléments qui se chevauchent dans une grille horaire
 * (vues Jour / Semaine) : chaque élément reçoit une part de largeur, pour que
 * deux événements simultanés restent lisibles l'un à côté de l'autre au lieu de
 * se recouvrir complètement.
 *
 * Algorithme glouton classique : on regroupe les éléments en « grappes »
 * chaînées (chacun chevauche le précédent), puis on attribue à chaque élément
 * la première colonne libre ; la largeur = 100 / nombre de colonnes de la grappe.
 */

export interface SlotLayout {
  /** décalage horizontal en % de la colonne */
  leftPct: number;
  /** largeur en % de la colonne */
  widthPct: number;
}

export interface Layoutable {
  id: string;
  start: string;
  end: string;
}

export function layoutOverlaps(items: Layoutable[]): Map<string, SlotLayout> {
  const result = new Map<string, SlotLayout>();
  const sorted = [...items].sort(
    (a, b) => minutesOf(a.start) - minutesOf(b.start) || endMinutesOf(a.end) - endMinutesOf(b.end) || a.id.localeCompare(b.id),
  );

  let cluster: Layoutable[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnd: number[] = [];
    const colOf = new Map<string, number>();
    for (const inst of cluster) {
      const s = minutesOf(inst.start);
      const e = endMinutesOf(inst.end);
      let col = colEnd.findIndex((ce) => ce <= s);
      if (col === -1) {
        col = colEnd.length;
        colEnd.push(e);
      } else {
        colEnd[col] = e;
      }
      colOf.set(inst.id, col);
    }
    const n = Math.max(1, colEnd.length);
    for (const inst of cluster) {
      const col = colOf.get(inst.id) ?? 0;
      result.set(inst.id, { leftPct: (col * 100) / n, widthPct: 100 / n });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const inst of sorted) {
    const s = minutesOf(inst.start);
    if (cluster.length > 0 && s >= clusterEnd) flush();
    cluster.push(inst);
    clusterEnd = Math.max(clusterEnd, endMinutesOf(inst.end));
  }
  flush();

  // tout ce qui n'a aucun chevauchement garde la pleine largeur
  for (const inst of items) {
    if (!result.has(inst.id)) result.set(inst.id, { leftPct: 0, widthPct: 100 });
  }
  return result;
}

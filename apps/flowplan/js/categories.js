/*
 * FlowPlan — catégorisation automatique d'un événement d'après son titre.
 * Zéro dépendance, testable en Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FlowPlanCategories = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const RULES = [
    { cat: 'travail', color: '#4f9cff', words: ['reunion', 'réunion', 'meeting', 'travail', 'boulot', 'visio', 'appel', 'client', 'rapport', 'deadline', 'présentation', 'presentation', 'entretien', 'bureau'] },
    { cat: 'sport', color: '#4ade80', words: ['sport', 'gym', 'foot', 'basket', 'tennis', 'course', 'running', 'yoga', 'velo', 'vélo', 'piscine', 'musculation', 'gymnase'] },
    { cat: 'sante', color: '#fb7185', words: ['dentiste', 'medecin', 'médecin', 'docteur', 'kine', 'kiné', 'pharmacie', 'vaccin', 'hopital', 'hôpital', 'psy', 'therapie', 'thérapie', 'analyse'] },
    { cat: 'perso', color: '#7c5cff', words: ['anniversaire', 'mariage', 'soiree', 'soirée', 'apero', 'apéro', 'diner', 'dîner', 'famille', 'amis', 'cadeau', 'fete', 'fête', 'vacances', 'voyage', 'lea', 'léa'] },
    { cat: 'courses', color: '#fbbf24', words: ['courses', 'supermarche', 'supermarché', 'marche', 'marché', 'menage', 'ménage', 'lessive', 'courses', 'boulangerie', 'magasin'] },
    { cat: 'etudes', color: '#22d3ee', words: ['cours', 'examen', 'controle', 'contrôle', 'devoir', 'revision', 'révision', 'universite', 'université', 'école', 'ecole', 'amphi'] },
  ];

  const FALLBACK = { cat: 'autre', color: '#8b98a8' };

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, ' ');
  }

  function categorize(title) {
    const t = ' ' + norm(title) + ' ';
    for (const rule of RULES) {
      for (const w of rule.words) {
        if (t.includes(' ' + w) || t.includes(w + ' ') || t.includes(' ' + w + 's') || t.includes(w + 's ')) {
          return { cat: rule.cat, color: rule.color };
        }
      }
    }
    return FALLBACK;
  }

  return { categorize, RULES, FALLBACK };
});

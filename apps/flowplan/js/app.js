/* FlowPlan — UI v2 : saisie texte/voix, semaine + mois, drag&drop, filtres, recherche, thème clair/sombre. */
(function () {
  'use strict';

  const Parser = window.FlowPlanParser;
  const Planner = window.FlowPlanPlanner;
  const Store = window.FlowPlanStore;
  const Voice = window.FlowPlanVoice;
  const Categories = window.FlowPlanCategories;
  const ICS = window.FlowPlanICS;

  const planner = Planner.createPlanner();
  planner.load(Store.load());

  const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const $ = id => document.getElementById(id);
  const els = {
    input: $('fp-input'),
    btnGen: $('fp-generate'),
    btnVoice: $('fp-voice'),
    status: $('fp-status'),
    weekLabel: $('fp-week-label'),
    btnPrev: $('fp-prev-week'),
    btnNext: $('fp-next-week'),
    btnToday: $('fp-today-week'),
    week: $('fp-week'),
    month: $('fp-month'),
    stats: $('fp-stats'),
    conflictBox: $('fp-conflicts'),
    filters: $('fp-filters'),
    search: $('fp-search'),
    viewWeek: $('fp-view-week'),
    viewMonth: $('fp-view-month'),
    theme: $('fp-theme'),
    modal: $('fp-modal'),
    mTitle: $('fp-modal-title'),
    mDate: $('fp-modal-date'),
    mStart: $('fp-modal-start'),
    mEnd: $('fp-modal-end'),
    mAllDay: $('fp-modal-allday'),
    mCat: $('fp-modal-cat'),
    mSave: $('fp-modal-save'),
    mDelete: $('fp-modal-delete'),
    mCancel: $('fp-modal-cancel'),
  };

  let currentWeekStart = Planner.weekStartISO(null);
  let view = 'week'; // 'week' | 'month'
  let editingId = null;
  let voiceCtl = null;
  let activeCat = null;
  let dragId = null;

  // ---------- thème ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    els.theme.textContent = t === 'light' ? '🌙 Sombre' : '☀️ Clair';
    try { localStorage.setItem('flowplan.theme', t); } catch (e) {}
  }
  const savedTheme = (function () { try { return localStorage.getItem('flowplan.theme'); } catch (e) { return null; } })();
  applyTheme(savedTheme || 'dark');
  els.theme.addEventListener('click', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });

  // ---------- persistance ----------
  function persist() {
    const ok = Store.save(planner.toJSON());
    if (!ok) setStatus('⚠️ Stockage local plein : le planning n\'a pas pu être sauvegardé.', true);
    return ok;
  }

  function fmtDate(iso) {
    if (!iso) return 'Sans date';
    const d = new Date(iso + 'T12:00:00');
    return DAYS_FR[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS_FR[d.getMonth()] + ' ' + d.getFullYear();
  }

  function setStatus(msg, isErr) {
    els.status.textContent = msg || '';
    els.status.classList.toggle('error', !!isErr);
  }

  // ---------- génération ----------
  function generate() {
    const text = els.input.value.trim();
    if (!text) { setStatus('Écris ou dicte ton planning d\'abord.', true); return; }
    const events = Parser.parse(text, new Date());
    if (!events.length) { setStatus('Je n\'ai rien compris — essaie par exemple : « Lundi 10h réunion équipe ; mercredi 14h30 dentiste »', true); return; }
    let added = 0;
    for (const ev of events) {
      const cat = Categories.categorize(ev.title);
      const clean = planner.add({ title: ev.title, date: ev.date, start: ev.start, end: ev.end, allDay: ev.allDay, cat: cat.cat, color: cat.color });
      added++;
      if (!clean.date) planner.update(clean.id, { date: currentWeekStart });
    }
    persist();
    els.input.value = '';
    setStatus(added + ' événement(s) ajouté(s) ✓');
    render();
  }

  // ---------- voix ----------
  function toggleVoice() {
    if (!Voice.isSupported()) { setStatus('Saisie vocale non disponible sur ce navigateur (essaie Chrome/Edge).', true); return; }
    if (voiceCtl) { voiceCtl.stop(); voiceCtl = null; els.btnVoice.classList.remove('listening'); els.btnVoice.textContent = '🎙️ Voix'; return; }
    els.btnVoice.classList.add('listening');
    els.btnVoice.textContent = '⏹️ Stop';
    setStatus('Parle maintenant… (ex. « mardi 9h sport, jeudi 18h apéro »)');
    voiceCtl = Voice.start({
      lang: 'fr-FR',
      onResult: function (txt) {
        els.input.value = (els.input.value ? els.input.value + ' ; ' : '') + txt;
        setStatus('Reconnu : « ' + txt + ' » — clique sur Générer.');
      },
      onError: function (e) { setStatus(e.message, true); },
      onEnd: function () {
        els.btnVoice.classList.remove('listening');
        els.btnVoice.textContent = '🎙️ Voix';
        voiceCtl = null;
      },
    });
  }

  // ---------- rendu : filtres ----------
  function renderFilters() {
    const box = els.filters;
    box.innerHTML = '';
    const mk = (label, cat, color) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fp-filter' + (activeCat === cat ? ' active' : '');
      b.setAttribute('data-cat', cat || '');
      if (color) b.style.borderColor = color;
      b.textContent = label;
      b.addEventListener('click', function () {
        activeCat = cat || null;
        renderFilters(); renderView();
      });
      box.appendChild(b);
    };
    mk('Tous (' + planner.all().length + ')', null);
    for (const c of planner.categories()) mk(c.cat + ' (' + c.count + ')', c.cat, c.color);
  }

  // ---------- rendu : semaine ----------
  function eventCard(ev, conflicted, compact) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'fp-event' + (ev.allDay ? ' allday' : '') + (conflicted.has(ev.id) ? ' conflicted' : '');
    card.draggable = !compact;
    card.setAttribute('data-id', ev.id);
    if (ev.color) card.style.borderLeft = '4px solid ' + ev.color;
    const time = ev.allDay ? 'Journée' : (ev.start || '') + (ev.end ? ' – ' + ev.end : '');
    const t = document.createElement('span');
    t.className = 'fp-event-time';
    t.textContent = time;
    const ti = document.createElement('span');
    ti.className = 'fp-event-title';
    ti.textContent = ev.title;
    card.appendChild(t);
    card.appendChild(ti);
    if (!compact && ev.cat && ev.cat !== 'autre') {
      const chip = document.createElement('span');
      chip.className = 'fp-chip';
      chip.textContent = ev.cat;
      if (ev.color) chip.style.background = ev.color + '33';
      card.appendChild(chip);
    }
    card.addEventListener('click', function () { openModal(ev); });
    card.addEventListener('dragstart', function (e) {
      dragId = ev.id;
      e.dataTransfer.setData('text/plain', ev.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', function () {
      dragId = null;
      card.classList.remove('dragging');
    });
    return card;
  }

  function renderWeek() {
    const conflicted = planner.conflictedIds();
    const w = planner.week(currentWeekStart);
    const start = new Date(w.start + 'T12:00:00');
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    els.weekLabel.textContent = w.start.slice(8, 10) + ' ' + MONTHS_FR[start.getMonth()] + ' → ' +
      end.getDate() + ' ' + MONTHS_FR[end.getMonth()] + ' ' + end.getFullYear();
    els.week.innerHTML = '';
    const today = Parser.todayISO(new Date());
    for (const d of w.days) {
      const col = document.createElement('div');
      col.className = 'fp-day';
      col.setAttribute('data-date', d.date);
      const dObj = new Date(d.date + 'T12:00:00');
      const head = document.createElement('div');
      head.className = 'fp-day-head' + (d.date === today ? ' today' : '');
      const h1 = document.createElement('span');
      h1.textContent = DAYS_FR[(dObj.getDay() + 6) % 7];
      const h2 = document.createElement('span');
      h2.textContent = dObj.getDate();
      head.appendChild(h1);
      head.appendChild(h2);
      col.appendChild(head);
      const visible = d.events.filter(ev => !activeCat || (ev.cat || 'autre') === activeCat);
      for (const ev of visible) col.appendChild(eventCard(ev, conflicted, false));
      if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'fp-empty';
        empty.textContent = activeCat ? 'Aucun « ' + activeCat + ' »' : 'Rien de prévu — dépose un événement ici';
        col.appendChild(empty);
      }
      // zone de drop pour le drag & drop
      col.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('droptarget'); });
      col.addEventListener('dragleave', function () { col.classList.remove('droptarget'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('droptarget');
        const id = e.dataTransfer.getData('text/plain') || dragId;
        if (id) {
          planner.update(id, { date: d.date });
          persist();
          setStatus('Événement déplacé au ' + fmtDate(d.date) + ' ✓');
          render();
        }
      });
      els.week.appendChild(col);
    }
  }

  // ---------- rendu : mois ----------
  function renderMonth() {
    const conflicted = planner.conflictedIds();
    const month = Planner.monthOfISO(currentWeekStart);
    const g = planner.monthGrid(month);
    const [y, m] = month.split('-').map(Number);
    els.weekLabel.textContent = MONTHS_FR[m - 1].charAt(0).toUpperCase() + MONTHS_FR[m - 1].slice(1) + ' ' + y;
    els.month.innerHTML = '';
    const today = Parser.todayISO(new Date());
    for (const weekDays of g.weeks) {
      for (const d of weekDays) {
        const cell = document.createElement('div');
        cell.className = 'fp-cell' + (d.inMonth ? '' : ' out') + (d.date === today ? ' today' : '');
        cell.setAttribute('data-date', d.date);
        const num = document.createElement('span');
        num.className = 'fp-cell-num';
        num.textContent = Number(d.date.slice(8, 10));
        cell.appendChild(num);
        const visible = d.events.filter(ev => !activeCat || (ev.cat || 'autre') === activeCat).slice(0, 4);
        for (const ev of visible) {
          const dot = document.createElement('div');
          dot.className = 'fp-cell-ev' + (conflicted.has(ev.id) ? ' conflicted' : '');
          if (ev.color) dot.style.background = ev.color;
          const label = document.createElement('span');
          label.textContent = (ev.allDay ? '' : (ev.start || '') + ' ') + ev.title;
          dot.appendChild(label);
          dot.title = ev.title + (ev.start ? ' (' + ev.start + (ev.end ? '–' + ev.end : '') + ')' : '');
          dot.addEventListener('click', function () { openModal(ev); });
          cell.appendChild(dot);
        }
        if (d.events.length > 4) {
          const more = document.createElement('div');
          more.className = 'fp-cell-more';
          more.textContent = '+' + (d.events.length - 4) + ' autres';
          cell.appendChild(more);
        }
        cell.addEventListener('dragover', function (e) { e.preventDefault(); cell.classList.add('droptarget'); });
        cell.addEventListener('dragleave', function () { cell.classList.remove('droptarget'); });
        cell.addEventListener('drop', function (e) {
          e.preventDefault();
          cell.classList.remove('droptarget');
          const id = e.dataTransfer.getData('text/plain') || dragId;
          if (id) { planner.update(id, { date: d.date }); persist(); setStatus('Événement déplacé au ' + fmtDate(d.date) + ' ✓'); render(); }
        });
        cell.addEventListener('dblclick', function () {
          currentWeekStart = Planner.weekStartISO(d.date);
          setView('week');
        });
        els.month.appendChild(cell);
      }
    }
  }

  function renderView() {
    const isWeek = view === 'week';
    els.week.style.display = isWeek ? '' : 'none';
    els.month.style.display = isWeek ? 'none' : 'grid';
    els.viewWeek.classList.toggle('active', isWeek);
    els.viewMonth.classList.toggle('active', !isWeek);
    if (isWeek) renderWeek(); else renderMonth();
  }

  function renderStats() {
    const s = planner.stats(currentWeekStart);
    els.stats.innerHTML = '';
    const mk = (bold, rest, cls) => {
      const span = document.createElement('span');
      if (cls) span.className = cls;
      const b = document.createElement('b');
      b.textContent = bold;
      span.appendChild(b);
      span.appendChild(document.createTextNode(rest));
      els.stats.appendChild(span);
    };
    mk(s.totalEvents, ' événement(s)');
    mk(s.plannedHours + ' h', ' planifiées');
    mk(s.conflicts ? s.conflicts + ' conflit(s) ⚠️' : 'Aucun conflit ✓', '', s.conflicts ? 'warn' : 'ok');
    const conflicts = planner.conflicts();
    if (conflicts.length) {
      els.conflictBox.hidden = false;
      els.conflictBox.textContent = 'Conflits : ' + conflicts.map(c =>
        c.date + ' — « ' + c.a.title + ' » chevauche « ' + c.b.title + ' »').join(' | ');
    } else {
      els.conflictBox.hidden = true;
    }
  }

  function render() {
    renderFilters();
    renderView();
    renderStats();
  }

  // ---------- recherche ----------
  els.search.addEventListener('input', function () {
    const q = els.search.value;
    if (!q) { render(); return; }
    const found = planner.search(q);
    els.week.innerHTML = '';
    els.month.innerHTML = '';
    els.week.style.display = '';
    els.month.style.display = 'none';
    const conflicted = planner.conflictedIds();
    const col = document.createElement('div');
    col.className = 'fp-day fp-search-results';
    const head = document.createElement('div');
    head.className = 'fp-day-head';
    head.textContent = found.length + ' résultat(s) pour « ' + q + ' »';
    col.appendChild(head);
    for (const ev of found) {
      const card = eventCard(ev, conflicted, false);
      card.insertBefore(document.createTextNode(fmtDate(ev.date) + ' — '), card.firstChild);
      col.appendChild(card);
    }
    els.week.appendChild(col);
    els.stats.innerHTML = '';
    els.conflictBox.hidden = true;
  });

  // ---------- modale ----------
  function openModal(ev) {
    editingId = ev ? ev.id : null;
    els.modal.hidden = false;
    els.modal.classList.add('open'); // pilotage visuel robuste (ne dépend pas que de [hidden])
    els.mTitle.value = ev ? ev.title : '';
    els.mDate.value = ev && ev.date ? ev.date : currentWeekStart;
    els.mStart.value = ev && ev.start ? ev.start : '';
    els.mEnd.value = ev && ev.end ? ev.end : '';
    els.mAllDay.checked = ev ? ev.allDay : false;
    els.mCat.value = ev && ev.cat ? ev.cat : 'autre';
    els.mDelete.style.display = ev ? '' : 'none';
    els.modal.hidden = false;
    els.mTitle.focus();
  }

  function closeModal() {
    els.modal.hidden = true;
    els.modal.classList.remove('open');
    editingId = null;
  }

  // fermer la modale en cliquant sur le fond gris (pas sur la carte elle-même)
  els.modal.addEventListener('click', function (e) {
    if (e.target === els.modal) closeModal();
  });

  function saveModal() {
    const title = els.mTitle.value.trim();
    if (!title) { els.mTitle.focus(); return; }
    const catName = els.mCat.value;
    const rule = Categories.RULES.find(r => r.cat === catName);
    const patch = {
      title: title,
      date: els.mDate.value || null,
      start: els.mStart.value || null,
      end: els.mEnd.value || null,
      allDay: els.mAllDay.checked,
      cat: catName,
      color: rule ? rule.color : Categories.FALLBACK.color,
    };
    if (editingId) planner.update(editingId, patch);
    else planner.add(patch);
    persist();
    closeModal();
    render();
  }

  function deleteModal() {
    if (editingId) { planner.remove(editingId); persist(); }
    closeModal();
    render();
  }

  // ---------- vues ----------
  function setView(v) {
    view = v;
    renderView();
  }
  els.viewWeek.addEventListener('click', function () { setView('week'); });
  els.viewMonth.addEventListener('click', function () { setView('month'); });

  // ---------- navigation ----------
  function step(days) {
    if (view === 'week') currentWeekStart = Planner.addDaysISO(currentWeekStart, days * 7);
    else {
      const [y, m] = Planner.monthOfISO(currentWeekStart).split('-').map(Number);
      const d = new Date(y, m - 1 + days, 1);
      currentWeekStart = Planner.weekStartISO(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01');
    }
    renderView(); renderStats();
  }
  els.btnPrev.addEventListener('click', function () { step(-1); });
  els.btnNext.addEventListener('click', function () { step(1); });
  els.btnToday.addEventListener('click', function () { currentWeekStart = Planner.weekStartISO(null); renderView(); renderStats(); });

  // ---------- divers ----------
  function exportICS() {
    const text = ICS.toICS(planner.all());
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flowplan.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    setStatus('Calendrier exporté (flowplan.ics) — importable dans Google Agenda / Outlook / Apple Calendrier ✓');
  }

  els.btnGen.addEventListener('click', generate);
  els.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate();
  });
  els.btnVoice.addEventListener('click', toggleVoice);
  $('fp-add').addEventListener('click', function () { openModal(null); });
  $('fp-export').addEventListener('click', exportICS);
  $('fp-print').addEventListener('click', function () { window.print(); });
  els.mSave.addEventListener('click', saveModal);
  els.mCancel.addEventListener('click', closeModal);
  els.mDelete.addEventListener('click', deleteModal);
  $('fp-modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !els.modal.hidden) closeModal();
  });
  for (const ex of document.querySelectorAll('.fp-example')) {
    ex.addEventListener('click', function () {
      els.input.value = ex.getAttribute('data-example');
      setStatus('Exemple chargé — clique sur Générer ✨');
    });
  }

  render();
  setStatus('Bienvenue dans FlowPlan 👋 Décris ta semaine ci-dessous.');
})();

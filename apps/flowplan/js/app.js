/* FlowPlan — UI : saisie texte/voix, génération, semaine, édition, stats. */
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
    stats: $('fp-stats'),
    conflictBox: $('fp-conflicts'),
    modal: $('fp-modal'),
    mTitle: $('fp-modal-title'),
    mDate: $('fp-modal-date'),
    mStart: $('fp-modal-start'),
    mEnd: $('fp-modal-end'),
    mAllDay: $('fp-modal-allday'),
    mSave: $('fp-modal-save'),
    mDelete: $('fp-modal-delete'),
    mCancel: $('fp-modal-cancel'),
  };

  let currentWeekStart = Planner.weekStartISO(null);
  let editingId = null;
  let voiceCtl = null;

  function persist() { Store.save(planner.toJSON()); }

  function fmtDate(iso) {
    if (!iso) return 'Sans date';
    const d = new Date(iso + 'T12:00:00');
    return DAYS_FR[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS_FR[d.getMonth()] + ' ' + d.getFullYear();
  }

  function setStatus(msg, isErr) {
    els.status.textContent = msg || '';
    els.status.classList.toggle('error', !!isErr);
  }

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
      if (!clean.date) { planner.update(clean.id, { date: currentWeekStart }); }
    }
    persist();
    els.input.value = '';
    setStatus(added + ' événement(s) ajouté(s) ✓');
    render();
  }

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

  function renderWeek() {
    const w = planner.week(currentWeekStart);
    const start = new Date(w.start + 'T12:00:00');
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    els.weekLabel.textContent = w.start.slice(8, 10) + ' ' + MONTHS_FR[start.getMonth()] + ' → ' +
      end.getDate() + ' ' + MONTHS_FR[end.getMonth()] + ' ' + end.getFullYear();
    els.week.innerHTML = '';
    for (const d of w.days) {
      const col = document.createElement('div');
      col.className = 'fp-day';
      const dObj = new Date(d.date + 'T12:00:00');
      const head = document.createElement('div');
      head.className = 'fp-day-head';
      head.innerHTML = '<span>' + DAYS_FR[(dObj.getDay() + 6) % 7] + '</span><span>' + dObj.getDate() + '</span>';
      if (d.date === Parser.todayISO(new Date())) head.classList.add('today');
      col.appendChild(head);
      for (const ev of d.events) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'fp-event' + (ev.allDay ? ' allday' : '');
        if (ev.color) card.style.borderLeft = '4px solid ' + ev.color;
        const time = ev.allDay ? 'Journée' : (ev.start || '') + (ev.end ? ' – ' + ev.end : '');
        card.innerHTML = '';
        const t = document.createElement('span');
        t.className = 'fp-event-time';
        t.textContent = time;
        const ti = document.createElement('span');
        ti.className = 'fp-event-title';
        ti.textContent = ev.title;
        card.appendChild(t);
        card.appendChild(ti);
        if (ev.cat && ev.cat !== 'autre') {
          const chip = document.createElement('span');
          chip.className = 'fp-chip';
          chip.textContent = ev.cat;
          if (ev.color) chip.style.background = ev.color + '33';
          card.appendChild(chip);
        }
        card.addEventListener('click', function () { openModal(ev); });
        col.appendChild(card);
      }
      if (!d.events.length) {
        const empty = document.createElement('div');
        empty.className = 'fp-empty';
        empty.textContent = 'Rien de prévu';
        col.appendChild(empty);
      }
      els.week.appendChild(col);
    }
  }

  function renderStats() {
    const s = planner.stats(currentWeekStart);
    els.stats.innerHTML =
      '<span><b>' + s.totalEvents + '</b> événement(s)</span>' +
      '<span><b>' + s.plannedHours + ' h</b> planifiées</span>' +
      '<span class="' + (s.conflicts ? 'warn' : 'ok') + '">' + (s.conflicts ? s.conflicts + ' conflit(s) ⚠️' : 'Aucun conflit ✓') + '</span>';
    const conflicts = planner.conflicts();
    if (conflicts.length) {
      els.conflictBox.hidden = false;
      els.conflictBox.textContent = 'Conflits détectés : ' + conflicts.map(c =>
        c.date + ' — « ' + c.a.title + ' » chevauche « ' + c.b.title + ' »').join(' | ');
    } else {
      els.conflictBox.hidden = true;
    }
  }

  function render() { renderWeek(); renderStats(); }

  function openModal(ev) {
    editingId = ev ? ev.id : null;
    els.mTitle.value = ev ? ev.title : '';
    els.mDate.value = ev && ev.date ? ev.date : currentWeekStart;
    els.mStart.value = ev && ev.start ? ev.start : '';
    els.mEnd.value = ev && ev.end ? ev.end : '';
    els.mAllDay.checked = ev ? ev.allDay : !ev;
    els.mDelete.style.display = ev ? '' : 'none';
    els.modal.hidden = false;
    els.mTitle.focus();
  }

  function closeModal() { els.modal.hidden = true; editingId = null; }

  function saveModal() {
    const title = els.mTitle.value.trim();
    if (!title) { els.mTitle.focus(); return; }
    const patch = {
      title: title,
      date: els.mDate.value || null,
      start: els.mStart.value || null,
      end: els.mEnd.value || null,
      allDay: els.mAllDay.checked,
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

  function printWeek() { window.print(); }

  els.btnGen.addEventListener('click', generate);
  els.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate();
  });
  els.btnVoice.addEventListener('click', toggleVoice);
  els.btnPrev.addEventListener('click', function () { currentWeekStart = Planner.addDaysISO(currentWeekStart, -7); render(); });
  els.btnNext.addEventListener('click', function () { currentWeekStart = Planner.addDaysISO(currentWeekStart, 7); render(); });
  els.btnToday.addEventListener('click', function () { currentWeekStart = Planner.weekStartISO(null); render(); });
  $('fp-add').addEventListener('click', function () { openModal(null); });
  $('fp-export').addEventListener('click', exportICS);
  $('fp-print').addEventListener('click', printWeek);
  for (const ex of document.querySelectorAll('.fp-example')) {
    ex.addEventListener('click', function () {
      els.input.value = ex.getAttribute('data-example');
      setStatus('Exemple chargé — clique sur Générer ✨');
    });
  }
  els.mSave.addEventListener('click', saveModal);
  els.mCancel.addEventListener('click', closeModal);
  els.mDelete.addEventListener('click', deleteModal);

  render();
  setStatus('Bienvenue dans FlowPlan 👋 Décris ta semaine ci-dessous.');
})();

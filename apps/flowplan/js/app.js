/* FlowPlan — UI v2 : saisie texte/voix, semaine + mois, drag&drop, filtres, recherche, thème clair/sombre. */
(function () {
  'use strict';

  const Parser = window.FlowPlanParser;
  const Planner = window.FlowPlanPlanner;
  const Store = window.FlowPlanStore;
  const Voice = window.FlowPlanVoice;
  const Categories = window.FlowPlanCategories;
  const ICS = window.FlowPlanICS;
  const ICSImport = window.FlowPlanICSImport;
  const Vault = window.FlowPlanVault;
  const SecureStore = window.FlowPlanSecureStore;

  const planner = Planner.createPlanner();
  const secureStore = SecureStore.create(Store, Vault, localStorage);
  let booted = false;

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
    viewDay: $('fp-view-day'),
    day: $('fp-day'),
    theme: $('fp-theme'),
    menuBtn: $('fp-menu-btn'),
    menuPanel: $('fp-menu-panel'),
    examplesToggle: $('fp-examples-toggle'),
    examples: $('fp-examples'),
    reset: $('fp-reset'),
    reminders: $('fp-reminders'),
    undo: $('fp-undo'),
    toasts: $('fp-toasts'),
    modal: $('fp-modal'),
    mTitle: $('fp-modal-title'),
    mDate: $('fp-modal-date'),
    mStart: $('fp-modal-start'),
    mEnd: $('fp-modal-end'),
    mAllDay: $('fp-modal-allday'),
    mCat: $('fp-modal-cat'),
    mNotes: $('fp-modal-notes'),
    mSave: $('fp-modal-save'),
    mDelete: $('fp-modal-delete'),
    mCancel: $('fp-modal-cancel'),
  };

  let currentWeekStart = Planner.weekStartISO(null);
  let view = 'week'; // 'week' | 'month' | 'day'
  let currentDay = Parser.todayISO(new Date());
  let editingId = null;
  let voiceCtl = null;
  let activeCat = null;
  let dragId = null;

  // ---------- thème : 'auto' suit le système, sinon dark/light forcé ----------
  function currentSavedTheme() {
    try {
      const v = localStorage.getItem('flowplan.theme');
      // 'light' stocké = l'utilisateur avait choisi clair AVANT ; on respecte.
      // sinon défaut dark (le HTML est dark aussi).
      return v === 'light' || v === 'dark' || v === 'auto' ? v : 'dark';
    } catch (e) { return 'dark'; }
  }
  function applyTheme(t) {
    if (t === 'auto') {
      const sys = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', sys);
      els.theme.textContent = '🖥️ Auto (système)';
    } else {
      document.documentElement.setAttribute('data-theme', t);
      els.theme.textContent = t === 'light' ? '🌙 Sombre' : '☀️ Clair';
    }
    try { localStorage.setItem('flowplan.theme', t); } catch (e) {}
  }
  applyTheme(currentSavedTheme());
  els.theme.addEventListener('click', function () {
    const cur = currentSavedTheme();
    applyTheme(cur === 'auto' ? 'light' : cur === 'light' ? 'dark' : 'auto'); // cycle auto -> light -> dark
  });
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
      if (currentSavedTheme() === 'auto') applyTheme('auto');
    });
  }

  els.undo.addEventListener('click', function () { els.menuPanel.hidden = true; doUndo(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && editingId) {
      e.preventDefault();
      const copy = planner.duplicate(editingId);
      if (copy) { persist(); closeModal(); render(); toast('📑 Événement dupliqué', false, true); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && els.modal.hidden) {
      e.preventDefault();
      doUndo();
    }
  });

  // menu ⋯ : s'ouvre/ferme, se ferme au clic ailleurs ou avec Échap
  els.menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    els.menuPanel.hidden = !els.menuPanel.hidden;
  });
  document.addEventListener('click', function (e) {
    if (!els.menuPanel.hidden && !els.menuPanel.contains(e.target)) els.menuPanel.hidden = true;
  });

  // exemples repliés par défaut
  els.examplesToggle.addEventListener('click', function () {
    els.examples.hidden = !els.examples.hidden;
    els.examplesToggle.textContent = els.examples.hidden ? 'voir des exemples ▾' : 'masquer les exemples ▴';
  });

  // réinitialisation des données SANS console : modale de confirmation maison
  // ---------- rappels navigateur (opt-in) ----------
  function remindersEnabled() {
    try { return localStorage.getItem('flowplan.reminders') === '1'; } catch (e) { return false; }
  }
  function setReminders(on) {
    try { localStorage.setItem('flowplan.reminders', on ? '1' : '0'); } catch (e) {}
    els.reminders.textContent = on ? '🔔 Rappels : activés' : '🔕 Rappels : désactivés';
    if (on && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    scheduleReminders();
  }
  els.reminders.addEventListener('click', function () {
    els.menuPanel.hidden = true;
    setReminders(!remindersEnabled());
    toast(remindersEnabled() ? '🔔 Rappels activés (demande de permission au navigateur si besoin)' : '🔕 Rappels désactivés');
  });
  let reminderTimer = null;
  function scheduleReminders() {
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = null;
    if (!remindersEnabled() || !('Notification' in window) || Notification.permission !== 'granted') return;
    reminderTimer = setInterval(checkReminders, 60000);
    checkReminders();
  }
  function checkReminders() {
    const now = new Date();
    const today = Parser.todayISO(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (const ev of planner.byDate(today)) {
      if (!ev.start || ev.allDay) continue;
      const [h, m] = ev.start.split(':').map(Number);
      const evMin = h * 60 + m;
      if (evMin - nowMin === 15 && !ev._notified) { // 15 min avant
        ev._notified = true;
        new Notification('Dans 15 min : ' + ev.title, { body: ev.start + ' — FlowPlan', icon: 'assets/icon-192.png' });
      }
    }
  }
  if (remindersEnabled()) scheduleReminders();

  // ---------- vault (PIN) ----------
  function refreshVaultMenu() {
    const on = Vault.isEnabled(localStorage);
    $('fp-vault').textContent = on ? '🔒 Verrou activé — cliquer pour désactiver' : '🔐 Verrouiller (code PIN)';
  }
  refreshVaultMenu();
  $('fp-vault').addEventListener('click', async function () {
    els.menuPanel.hidden = true;
    if (!Vault.isEnabled(localStorage)) {
      const pin = window.prompt('Choisis un code à 4+ caractères pour verrouiller FlowPlan :');
      if (pin == null) return;
      const pin2 = window.prompt('Confirme le code :');
      if (pin !== pin2) { toast('❌ Les codes ne correspondent pas', true); return; }
      try {
        await Vault.enable(pin, localStorage);
        await persist(); // re-chiffre immédiatement les données existantes
        refreshVaultMenu();
        toast('🔐 Verrou activé : tes données sont maintenant chiffrées (AES-GCM)');
      } catch (e) { toast('❌ ' + e.message, true); }
    } else {
      const pin = window.prompt('Entre ton code pour DÉSACTIVER le verrou (les données repassent en clair local) :');
      if (pin == null) return;
      const ok = await secureStore.unlock(pin);
      if (!ok) { toast('❌ Code incorrect', true); return; }
      Vault.disable(localStorage);
      await persist();
      secureStore.lock();
      refreshVaultMenu();
      toast('🔓 Verrou désactivé');
    }
  });

  els.reset.addEventListener('click', function () {
    els.menuPanel.hidden = true;
    const ok = window.confirm('Supprimer TOUS tes événements FlowPlan sur cet appareil ?\n(Cette action est irréversible.)');
    if (!ok) return;
    planner.load([]);
    Store.clear();
    activeCat = null;
    render();
    toast('🗑️ Données réinitialisées', false, true);
  });

  // ---------- persistance ----------
  function persist() {
    const data = planner.toJSON();
    if (Vault.isEnabled(localStorage)) {
      secureStore.save(data).then(function (ok) {
        if (!ok) toast('⚠️ Stockage plein : non sauvegardé', true);
      });
      return true;
    }
    const ok = Store.save(data);
    if (!ok) toast('⚠️ Stockage local plein : le planning n\'a pas pu être sauvegardé.', true);
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

  // Toast visible 4s, empilé en haut à droite ; msg peut contenir {undo:true}
  function toast(msg, isErr, withUndo) {
    const t = document.createElement('div');
    t.className = 'fp-toast' + (isErr ? ' error' : '');
    t.textContent = msg;
    if (withUndo) {
      const b = document.createElement('button');
      b.className = 'fp-toast-undo';
      b.textContent = 'Annuler';
      b.addEventListener('click', function () { doUndo(); t.remove(); });
      t.appendChild(b);
    }
    els.toasts.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, 4000);
  }

  function doUndo() {
    const label = planner.undo();
    if (label) {
      persist();
      render();
      toast('↩️ ' + label);
    } else {
      toast('Rien à annuler', true);
    }
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
      const date = ev.date || currentWeekStart; // pas de date reconnue -> semaine affichée
      planner.add({ title: ev.title, date: date, start: ev.start, end: ev.end, allDay: ev.allDay, cat: cat.cat, color: cat.color });
      added++;
    }
    persist();
    els.input.value = '';
    toast(added + ' événement(s) ajouté(s) ✓', false, added > 0);
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
    if (activeCat) {
      const badge = document.createElement('span');
      badge.className = 'fp-focus-badge';
      badge.textContent = '🎯 focus : ' + activeCat + ' (Échap pour tout voir)';
      box.appendChild(badge);
    }
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
    if (ev.notes) card.title = ev.notes;
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
          toast('📅 Déplacé au ' + fmtDate(d.date), false, true);
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
          if (id) { planner.update(id, { date: d.date }); persist(); toast('📅 Déplacé au ' + fmtDate(d.date), false, true); render(); }
        });
        cell.addEventListener('dblclick', function () {
          currentWeekStart = Planner.weekStartISO(d.date);
          setView('week');
        });
        els.month.appendChild(cell);
      }
    }
  }

  // ---------- rendu : jour ----------
  function renderDay() {
    const conflicted = planner.conflictedIds();
    const dayEvents = planner.byDate(currentDay);
    const dObj = new Date(currentDay + 'T12:00:00');
    els.weekLabel.textContent = DAYS_FR[(dObj.getDay() + 6) % 7] + ' ' + dObj.getDate() + ' ' + MONTHS_FR[dObj.getMonth()] + ' ' + dObj.getFullYear();
    els.day.innerHTML = '';
    // grille horaire 0h-24h
    for (let h = 0; h < 24; h++) {
      const row = document.createElement('div');
      row.className = 'fp-hour-row';
      row.setAttribute('data-hour', h);
      const lbl = document.createElement('span');
      lbl.className = 'fp-hour-label';
      lbl.textContent = pad2h(h) + ':00';
      row.appendChild(lbl);
      const slot = document.createElement('div');
      slot.className = 'fp-hour-slot';
      slot.setAttribute('data-date', currentDay);
      slot.setAttribute('data-hour', h);
      slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('droptarget'); });
      slot.addEventListener('dragleave', function () { slot.classList.remove('droptarget'); });
      slot.addEventListener('drop', function (e) {
        e.preventDefault();
        slot.classList.remove('droptarget');
        const id = e.dataTransfer.getData('text/plain') || dragId;
        if (id) {
          planner.update(id, { date: currentDay, start: pad2h(h) + ':00' });
          persist();
          toast('📅 Déplacé au ' + fmtDate(currentDay) + ' ' + pad2h(h) + ':00', false, true);
          render();
        }
      });
      row.appendChild(slot);
      els.day.appendChild(row);
    }
    // événements positionnés en hauteur proportionnelle
    for (const ev of dayEvents) {
      if (activeCat && (ev.cat || 'autre') !== activeCat) continue;
      const card = eventCard(ev, conflicted, false);
      card.classList.add('fp-day-event');
      if (ev.start) {
        const [h, m] = ev.start.split(':').map(Number);
        card.style.top = ((h * 60 + m) / 1440 * 100) + '%';
        const endM = ev.end ? ev.end.split(':').map(Number) : [h + 1, m];
        const dur = Math.max(30, (endM[0] * 60 + endM[1]) - (h * 60 + m));
        card.style.height = (dur / 1440 * 100) + '%';
      } else {
        card.style.top = '2px';
        card.style.height = 'auto';
      }
      els.day.appendChild(card);
    }
    if (!dayEvents.length || (activeCat && !dayEvents.some(e => (e.cat || 'autre') === activeCat))) {
      const empty = document.createElement('div');
      empty.className = 'fp-empty';
      empty.textContent = 'Rien ce jour — glisse un événement ici ou ajoute-en un';
      els.day.appendChild(empty);
    }
  }
  function pad2h(h) { return String(h).padStart(2, '0'); }

  function renderView() {
    const isWeek = view === 'week';
    const isMonth = view === 'month';
    els.week.style.display = isWeek ? '' : 'none';
    els.month.style.display = isMonth ? 'grid' : 'none';
    els.day.style.display = view === 'day' ? 'block' : 'none';
    els.viewWeek.classList.toggle('active', isWeek);
    els.viewMonth.classList.toggle('active', isMonth);
    els.viewDay.classList.toggle('active', view === 'day');
    if (isWeek) renderWeek(); else if (isMonth) renderMonth(); else renderDay();
  }

  function renderStats() {
    // conflits uniquement sur la semaine affichée (pas les semaines futures hors vue)
    const w = planner.week(currentWeekStart);
    const weekIds = new Set();
    for (const d of w.days) for (const e of d.events) weekIds.add(e.id);
    const weekConflicts = planner.conflicts().filter(c => weekIds.has(c.a.id) && weekIds.has(c.b.id));
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
    mk(weekConflicts.length ? weekConflicts.length + ' conflit(s) ⚠️' : 'Aucun conflit ✓', '', weekConflicts.length ? 'warn' : 'ok');
    if (weekConflicts.length) {
      els.conflictBox.hidden = false;
      els.conflictBox.textContent = 'Conflits cette semaine : ' + weekConflicts.map(c =>
        c.date.slice(8, 10) + '/' + c.date.slice(5, 7) + ' — « ' + c.a.title + ' » chevauche « ' + c.b.title + ' »').join(' | ');
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
    els.mNotes.value = ev && ev.notes ? ev.notes : '';
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
      notes: (els.mNotes.value || '').slice(0, 2000),
    };
    if (editingId) planner.update(editingId, patch);
    else planner.add(patch);
    persist();
    closeModal();
    toast('💾 Enregistré', false, true);
    render();
  }

  function deleteModal() {
    if (editingId) {
      planner.remove(editingId);
      persist();
      toast('🗑️ Événement supprimé', false, true);
    }
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
  els.viewDay.addEventListener('click', function () { currentDay = Parser.todayISO(new Date()); setView('day'); });

  // ---------- navigation ----------
  function step(days) {
    if (view === 'day') { currentDay = Planner.addDaysISO(currentDay, days); renderView(); renderStats(); return; }
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
    toast('📅 Exporté : flowplan.ics (importable dans Google Agenda / Outlook / Apple Calendrier) ✓');
  }

  // ---------- import .ics ----------
  let fileInput = null;
  function importICS() {
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.ics,text/calendar';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', function () {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const events = ICSImport.parse(String(reader.result || ''));
            let added = 0;
            for (const ev of events) {
              const cat = Categories.categorize(ev.title);
              const before = planner.all().length;
              planner.add({ title: ev.title, date: ev.date, start: ev.start, end: ev.end, allDay: ev.allDay, cat: cat.cat, color: cat.color });
              if (planner.all().length > before) added++;
            }
            persist();
            render();
            toast('📥 ' + added + ' événement(s) importé(s) depuis ' + f.name + (events.length > added ? ' (' + (events.length - added) + ' doublon(s) ignoré(s))' : ''), added > 0, added > 0);
          } catch (e) {
            toast('❌ Fichier .ics illisible : ' + e.message, true);
          }
          fileInput.value = '';
        };
        reader.onerror = function () { toast('❌ Impossible de lire le fichier', true); };
        reader.readAsText(f);
      });
      document.body.appendChild(fileInput);
    }
    fileInput.click();
  }

  els.btnGen.addEventListener('click', generate);
  els.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate();
  });
  els.btnVoice.addEventListener('click', toggleVoice);
  $('fp-add').addEventListener('click', function () { openModal(null); });
  $('fp-export').addEventListener('click', exportICS);
  $('fp-import').addEventListener('click', function () { els.menuPanel.hidden = true; importICS(); });
  // double-clic sur un jour en vue mois/semaine -> vue jour de ce jour
  document.addEventListener('dblclick', function (e) {
    const cell = e.target && e.target.closest ? e.target.closest('[data-date]') : null;
    if (cell && cell.getAttribute('data-date') && (view === 'month' || view === 'week')) {
      currentDay = cell.getAttribute('data-date');
      setView('day');
    }
  });
  $('fp-print').addEventListener('click', function () { window.print(); });
  els.mSave.addEventListener('click', saveModal);
  els.mCancel.addEventListener('click', closeModal);
  els.mDelete.addEventListener('click', deleteModal);
  $('fp-modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!els.modal.hidden) { closeModal(); return; }
      if (activeCat) { activeCat = null; render(); toast('🎯 Mode focus désactivé'); return; }
      if (!els.menuPanel.hidden) els.menuPanel.hidden = true;
    }
    // raccourcis : ←/→ = semaine/jour précédent/suivant ; ? = aide raccourcis
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 't' || e.key === 'T') { currentWeekStart = Planner.weekStartISO(null); currentDay = Parser.todayISO(new Date()); renderView(); renderStats(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); toast('⌨️ Raccourcis : ←/→ changer de période · Ctrl+Z annuler · Échap fermer/quitter focus · Ctrl+Entrée générer', false); }
  });
  for (const ex of document.querySelectorAll('.fp-example')) {
    ex.addEventListener('click', function () {
      els.input.value = ex.getAttribute('data-example');
      setStatus('Exemple chargé — clique sur Générer ✨');
    });
  }


  // ---------- boot : verrouillage ----------
  async function boot() {
    if (Vault.isEnabled(localStorage)) {
      const lockEl = $('fp-lock');
      lockEl.hidden = false;
      lockEl.classList.add('open');
      const pinEl = $('fp-lock-pin');
      const errEl = $('fp-lock-error');
      pinEl.focus();
      async function tryUnlock() {
        errEl.textContent = '';
        const ok = await secureStore.unlock(pinEl.value);
        if (ok) {
          lockEl.classList.remove('open');
          lockEl.hidden = true;
          const evs = await secureStore.load();
          planner.load(evs);
          booted = true;
          render();
          setStatus('🔓 Déverrouillé.');
        } else {
          errEl.textContent = 'Code incorrect.';
          pinEl.value = '';
          pinEl.focus();
        }
      }
      $('fp-lock-submit').addEventListener('click', tryUnlock);
      pinEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });
      return; // on attend le PIN
    }
    const evs = await secureStore.load();
    planner.load(evs);
    booted = true;
    render();
    setStatus('Bienvenue dans FlowPlan 👋 Décris ta semaine ci-dessous.');
  }

  boot();
})();

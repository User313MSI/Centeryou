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
 const CSV = window.FlowPlanCSV;

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
 demo: $('fp-demo'),
 voiceToggle: $('fp-voice-toggle'),
 fab: $('fp-fab'),
 freeSlots: $('fp-free-slots'),
 minical: $('fp-minical'),
 viewList: $('fp-view-list'),
 list: $('fp-list'),
 textsize: $('fp-textsize'),
 lockstate: $('fp-lockstate'),
 readDay: $('fp-read-day'),
 exportJson: $('fp-export-json'),
 mReminder: $('fp-modal-reminder'),
 repeatTomorrow: $('fp-repeat-tomorrow'),
 clock: $('fp-clock'),
 present: $('fp-present'),
 welcome: $('fp-welcome'),
 welcomeGo: $('fp-welcome-go'),
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
 let view = 'week'; // 'week' | 'month' | 'day' | 'list'
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
 els.theme.textContent = ' Auto (système)';
 } else {
 document.documentElement.setAttribute('data-theme', t);
 els.theme.textContent = t === 'light' ? ' Sombre' : ' Clair';
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
 if (copy) { persist(); closeModal(); render(); toast(' Événement dupliqué', false, true); }
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
 els.reminders.textContent = on ? ' Rappels : activés' : ' Rappels : désactivés';
 if (on && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
 scheduleReminders();
 }
 els.reminders.addEventListener('click', function () {
 els.menuPanel.hidden = true;
 setReminders(!remindersEnabled());
 toast(remindersEnabled() ? ' Rappels activés (demande de permission au navigateur si besoin)' : ' Rappels désactivés');
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
 const reminderMin = ev.reminder != null ? ev.reminder : 15; // POINT 37
 if (reminderMin > 0 && evMin - nowMin === reminderMin && !ev._notified) {
 ev._notified = true;
 const label = reminderMin >= 1440 ? 'Demain' : 'Dans ' + reminderMin + ' min';
 new Notification(label + ' : ' + ev.title, { body: ev.start + ' — FlowPlan', icon: 'assets/icon-192.png' });
 }
 }
 }
 if (remindersEnabled()) scheduleReminders();
 // POINT 41: verrouillage auto après 5 min d inactivité (si vault actif)
 let idleTimer = null;
 function resetIdle() {
 clearTimeout(idleTimer);
 idleTimer = setTimeout(function () {
 if (Vault.isEnabled(localStorage) && booted) {
 secureStore.lock();
 booted = false;
 const lockEl = $('fp-lock');
 lockEl.hidden = false;
 lockEl.classList.add('open');
 toast(' Verrouillé après inactivité', true);
 }
 }, 5 * 60 * 1000);
 }
 ['click', 'keydown', 'mousemove', 'touchstart'].forEach(function (ev) {
 document.addEventListener(ev, resetIdle, { passive: true });
 });
 resetIdle();

 // ---------- vault (PIN) ----------
 function refreshLockState() {
 els.lockstate.hidden = !Vault.isEnabled(localStorage);
 }
 refreshLockState();
 function refreshVaultMenu() {
 const on = Vault.isEnabled(localStorage);
 $('fp-vault').textContent = on ? ' Verrou activé — cliquer pour désactiver' : ' Verrouiller (code PIN)';
 }
 refreshVaultMenu();
 $('fp-vault').addEventListener('click', async function () {
 els.menuPanel.hidden = true;
 if (!Vault.isEnabled(localStorage)) {
 const pin = window.prompt('Choisis un code à 4+ caractères pour verrouiller FlowPlan :');
 if (pin == null) return;
 const pin2 = window.prompt('Confirme le code :');
 if (pin !== pin2) { toast(' Les codes ne correspondent pas', true); return; }
 try {
 await Vault.enable(pin, localStorage);
 await persist(); // re-chiffre immédiatement les données existantes
 refreshVaultMenu();
 toast(' Verrou activé : tes données sont maintenant chiffrées (AES-GCM)');
 } catch (e) { toast(' ' + e.message, true); }
 } else {
 const pin = window.prompt('Entre ton code pour DÉSACTIVER le verrou (les données repassent en clair local) :');
 if (pin == null) return;
 const ok = await secureStore.unlock(pin);
 if (!ok) { toast(' Code incorrect', true); return; }
 Vault.disable(localStorage);
 await persist();
 secureStore.lock();
 refreshVaultMenu();
 toast(' Verrou désactivé');
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
 toast(' Données réinitialisées', false, true);
 });

 // ---------- persistance ----------
 function persist() {
 const data = planner.toJSON();
 if (Vault.isEnabled(localStorage)) {
 secureStore.save(data).then(function (ok) {
 if (!ok) toast(' Stockage plein : non sauvegardé', true);
 });
 return true;
 }
 const ok = Store.save(data);
 if (!ok) toast(' Stockage local plein : le planning n\'a pas pu être sauvegardé.', true);
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
 toast('↩ ' + label);
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
 // génération PROGRESSIVE : un événement toutes les 220ms, chacun animé (tac tac tac)
 els.input.value = '';
 els.btnGen.disabled = true;
 let i = 0;
 const total = events.length;
 function stepAdd() {
 if (i >= events.length) {
 els.btnGen.disabled = false;
 persist();
 toast(total + ' événement(s) ajouté(s) ', false, total > 0);
 return;
 }
 const ev = events[i++];
 const cat = Categories.categorize(ev.title);
 const date = ev.date || currentWeekStart;
 const conflictWith = planner.wouldConflict({ date: date, start: ev.start, end: ev.end, allDay: ev.allDay });
 if (conflictWith) toast(' Chevauche « ' + conflictWith.title + ' » le même jour', true);
 const added = planner.add({ title: ev.title, date: date, start: ev.start, end: ev.end, allDay: ev.allDay, cat: cat.cat, color: cat.color });
 persist();
 render();
 // anime la carte qui vient d'apparaître
 const card = document.querySelector('.fp-event[data-id="' + added.id + '"]');
 if (card) {
 card.classList.add('just-added');
 try { const r = card.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, cat.color || '#5b8cff'); } catch (e) {}
 if (window.Animation && card.animate) {
 try {
 card.animate(
 [{ opacity: 0, transform: 'scale(.3) translateY(18px)' }, { opacity: 1, transform: 'scale(1.12)' }, { opacity: 1, transform: 'scale(1)' }],
 { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' }
 );
 } catch (e) {}
 }
 }
 setStatus(i + '/' + total + ' — « ' + ev.title + ' »');
 // VOIX en direct : annonce chaque événement ajouté (tac tac tac parlé)
 if (voiceEnabled()) {
 const dayName = ev.date ? DAYS_FR[(new Date(ev.date + 'T12:00:00').getDay() + 6) % 7] : '';
 speak((dayName ? dayName + ' ' : '') + (ev.start || '') + ' ' + ev.title, { rate: 1.25 });
 }
 setTimeout(stepAdd, 750); // la file d attente gère le rythme, on accélère le visuel
 }
 stepAdd();
 }

 // ---------- voix ----------
 function toggleVoice() {
 if (!Voice.isSupported()) { setStatus('Saisie vocale non disponible sur ce navigateur (essaie Chrome/Edge).', true); return; }
 if (voiceCtl) { voiceCtl.stop(); voiceCtl = null; els.btnVoice.classList.remove('listening'); els.btnVoice.textContent = ' Voix'; return; }
 els.btnVoice.classList.add('listening');
 els.btnVoice.textContent = '⏹ Stop';
 setStatus('Parle maintenant… (ex. « mardi 9h sport, jeudi 18h apéro »)');
 voiceCtl = Voice.start({
 lang: 'fr-FR',
 onResult: function (txt) {
 els.input.value = (els.input.value ? els.input.value + ' ; ' : '') + txt;
 setStatus('Reconnu : « ' + txt + ' » — clique sur Générer.');
 },
 onInterim: function (txt) {
 setStatus(' … « ' + txt + ' »');
 },
 onError: function (e) { setStatus(e.message, true); },
 onEnd: function () {
 els.btnVoice.classList.remove('listening');
 els.btnVoice.textContent = ' Voix';
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
 badge.textContent = ' focus : ' + activeCat + ' (Échap pour tout voir)';
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
 if (!compact) {
 const handle = document.createElement('div');
 handle.className = 'fp-resize-handle';
 handle.title = 'Tirer pour changer la durée';
 card.appendChild(handle);
 let resizing = null;
 handle.addEventListener('mousedown', function (e) {
 if (!ev.start) return;
 e.preventDefault(); e.stopPropagation();
 resizing = { id: ev.id, startY: e.clientY, origEnd: ev.end, origH: card.offsetHeight };
 card.classList.add('resizing');
 card.setAttribute('draggable', 'false');
 });
 document.addEventListener('mousemove', function (e) {
 if (!resizing) return;
 const dy = e.clientY - resizing.startY;
 const dayH = els.day.offsetHeight || 1440;
 const deltaMin = Math.round((dy / dayH * 1440) / 30) * 30; // blocs de 30 min
 const [h, m] = resizing.origEnd ? resizing.origEnd.split(':').map(Number) : [0, 0];
 const base = (h * 60 + m) + deltaMin;
 if (base > (parseInt(ev.start.split(':')[0], 10) * 60 + parseInt(ev.start.split(':')[1], 10)) + 30) {
 const nh = Math.floor(base / 60) % 24, nm = base % 60;
 planner.update(resizing.id, { end: String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0') });
 }
 });
 document.addEventListener('mouseup', function () {
 if (!resizing) return;
 resizing = null;
 card.classList.remove('resizing');
 card.setAttribute('draggable', 'true');
 persist();
 render();
 toast('⏱ Durée ajustée', false, true);
 });
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
 toast(' Déplacé au ' + fmtDate(d.date), false, true);
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
 if (id) { planner.update(id, { date: d.date }); persist(); toast(' Déplacé au ' + fmtDate(d.date), false, true); render(); }
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
 toast(' Déplacé au ' + fmtDate(currentDay) + ' ' + pad2h(h) + ':00', false, true);
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
 // ligne "maintenant" si aujourd'hui (P26)
 const oldNow = els.day.querySelector('.fp-nowline');
 if (oldNow) oldNow.remove();
 if (currentDay === Parser.todayISO(new Date())) {
 const n = new Date();
 const mins = n.getHours() * 60 + n.getMinutes();
 const line = document.createElement('div');
 line.className = 'fp-nowline';
 line.style.top = (mins / 1440 * 100) + '%';
 line.title = 'Maintenant : ' + String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
 els.day.appendChild(line);
 }
 }
 function pad2h(h) { return String(h).padStart(2, '0'); }

 function renderList() {
 const w = planner.week(currentWeekStart);
 els.weekLabel.textContent = els.weekLabel.textContent; // garde
 els.list.innerHTML = '';
 for (const d of w.days) {
 const visible = d.events.filter(ev => !activeCat || (ev.cat || 'autre') === activeCat);
 if (!visible.length) continue;
 const box = document.createElement('div');
 box.className = 'fp-list-day';
 const h = document.createElement('h4');
 const dObj = new Date(d.date + 'T12:00:00');
 h.textContent = DAYS_FR[(dObj.getDay() + 6) % 7] + ' ' + dObj.getDate() + ' ' + MONTHS_FR[dObj.getMonth()];
 box.appendChild(h);
 const conflicted = planner.conflictedIds();
 for (const ev of visible) {
 const row = document.createElement('div');
 row.className = 'fp-list-ev';
 const t = document.createElement('span');
 t.className = 't';
 t.textContent = ev.allDay ? 'Journée' : (ev.start || '') + (ev.end ? '–' + ev.end : '');
 const n = document.createElement('span');
 n.className = 'n';
 n.textContent = ev.title;
 row.appendChild(t); row.appendChild(n);
 if (ev.cat && ev.cat !== 'autre') {
 const c = document.createElement('span');
 c.className = 'c fp-chip';
 c.textContent = ev.cat;
 if (ev.color) c.style.background = ev.color + '33';
 row.appendChild(c);
 }
 if (conflicted.has(ev.id)) row.style.color = 'var(--warn)';
 row.addEventListener('click', function () { openModal(ev); });
 box.appendChild(row);
 }
 els.list.appendChild(box);
 }
 if (!els.list.children.length) {
 const e = document.createElement('div');
 e.className = 'fp-empty';
 e.textContent = 'Rien cette semaine';
 els.list.appendChild(e);
 }
 }

 function renderView() {
 const isWeek = view === 'week';
 const isMonth = view === 'month';
 const isList = view === 'list';
 els.week.style.display = isWeek ? '' : 'none';
 els.month.style.display = isMonth ? 'grid' : 'none';
 els.day.style.display = view === 'day' ? 'block' : 'none';
 els.list.style.display = isList ? 'flex' : 'none';
 els.viewWeek.classList.toggle('active', isWeek);
 els.viewMonth.classList.toggle('active', isMonth);
 els.viewDay.classList.toggle('active', view === 'day');
 els.viewList.classList.toggle('active', isList);
 if (isWeek) renderWeek(); else if (isMonth) renderMonth(); else if (isList) renderList(); else renderDay();
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
 mk(weekConflicts.length ? weekConflicts.length + ' conflit(s) ' : 'Aucun conflit ', '', weekConflicts.length ? 'warn' : 'ok');
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
 animateIngress();
 }

 // Animation d'entrée via Web Animations API : stagger ressort sur les jours et événements
 function animateIngress() {
 if (!document.body || !window.Animation || view === undefined) return;
 if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 const days = document.querySelectorAll('.fp-day');
 days.forEach((el, i) => {
 try {
 el.animate(
 [{ opacity: 0, transform: 'translateY(22px) scale(.96)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
 { duration: 380, delay: i * 45, easing: 'cubic-bezier(.22,1.2,.36,1)', fill: 'backwards' }
 );
 } catch (e) {}
 });
 const events = document.querySelectorAll('.fp-event:not(.just-added)');
 events.forEach((el, i) => {
 if (el.dataset.animated === '1') return;
 el.dataset.animated = '1';
 try {
 el.animate(
 [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }],
 { duration: 300, delay: 120 + i * 30, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }
 );
 } catch (e) {}
 });
 }

 // ---------- recherche ----------
 let searchTimer = null;
 els.search.addEventListener('input', function () {
 clearTimeout(searchTimer);
 searchTimer = setTimeout(doSearch, 150); // POINT 46: debounce
 });
 function doSearch() {
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
 }

 // ---------- modale ----------
 let lastFocused = null;
 function openModal(ev) {
 lastFocused = document.activeElement;
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
 if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
 }
 // focus trap : Tab reste dans la modale ouverte
 document.addEventListener('keydown', function (e) {
 if (e.key !== 'Tab' || els.modal.hidden) return;
 const focusables = els.modal.querySelectorAll('input, select, textarea, button');
 if (!focusables.length) return;
 const first = focusables[0], last = focusables[focusables.length - 1];
 if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
 else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
 });

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
 reminder: +els.mReminder.value || 0,
 };
 if (editingId) planner.update(editingId, patch);
 else planner.add(patch);
 persist();
 closeModal();
 toast(' Enregistré', false, true);
 render();
 }

 function deleteModal() {
 if (editingId) {
 planner.remove(editingId);
 persist();
 toast(' Événement supprimé', false, true);
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
 const weekEl = els.week;
 if (view === 'week' && weekEl) {
 weekEl.classList.remove('slide-left', 'slide-right');
 void weekEl.offsetWidth;
 weekEl.classList.add(days > 0 ? 'slide-left' : 'slide-right');
 }
 if (view === 'day') { currentDay = Planner.addDaysISO(currentDay, days); renderView(); renderStats(); return; }
 if (view === 'week') currentWeekStart = Planner.addDaysISO(currentWeekStart, days * 7);
 else {
 const [y, m] = Planner.monthOfISO(currentWeekStart).split('-').map(Number);
 const d = new Date(y, m - 1 + days, 1);
 currentWeekStart = Planner.weekStartISO(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01');
 }
 renderView(); renderStats();
 }
 els.minical.addEventListener('change', function () {
 if (!els.minical.value) return;
 currentWeekStart = Planner.weekStartISO(els.minical.value);
 currentDay = els.minical.value;
 renderView(); renderStats();
 toast(' Semaine du ' + fmtDate(currentWeekStart));
 });
 els.viewList.addEventListener('click', function () { setView('list'); });
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
 toast(' Exporté : flowplan.ics (importable dans Google Agenda / Outlook / Apple Calendrier) ');
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
 toast(' ' + added + ' événement(s) importé(s) depuis ' + f.name + (events.length > added ? ' (' + (events.length - added) + ' doublon(s) ignoré(s))' : ''), added > 0, added > 0);
 } catch (e) {
 toast(' Fichier .ics illisible : ' + e.message, true);
 }
 fileInput.value = '';
 };
 reader.onerror = function () { toast(' Impossible de lire le fichier', true); };
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
 els.fab.addEventListener('click', function () { openModal(null); }); // POINT 5: bouton flottant mobile
 // POINT 12: créneaux libres du jour de la modale
 els.freeSlots.addEventListener('click', function () {
 const d = els.mDate.value || currentWeekStart;
 const slots = planner.freeSlots(d, 60).slice(0, 8);
 if (!slots.length) { toast(' Aucun créneau libre ≥ 1h ce jour', true); return; }
 const old = els.modal.querySelector('.fp-slots');
 if (old) old.remove();
 const ul = document.createElement('ul');
 ul.className = 'fp-slots';
 slots.forEach(sl => {
 const li = document.createElement('li');
 const b = document.createElement('button');
 b.type = 'button';
 b.textContent = sl.start + ' – ' + sl.end;
 b.addEventListener('click', function () {
 els.mStart.value = sl.start;
 els.mEnd.value = sl.end;
 ul.remove();
 toast(' Créneau ' + sl.start + '–' + sl.end + ' appliqué');
 });
 li.appendChild(b);
 ul.appendChild(li);
 });
 els.modal.insertBefore(ul, els.modal.querySelector('.fp-modal-actions'));
 toast(' ' + slots.length + ' créneaux libres le ' + d);
 });
 $('fp-export').addEventListener('click', exportICS);
 $('fp-import').addEventListener('click', function () { els.menuPanel.hidden = true; importICS(); });
 let csvInput = null;
 const csvBtn = $('fp-import-csv');
 if (csvBtn) csvBtn.addEventListener('click', function () {
 els.menuPanel.hidden = true;
 if (!csvInput) {
 csvInput = document.createElement('input');
 csvInput.type = 'file'; csvInput.accept = '.csv,.tsv,.txt'; csvInput.style.display = 'none';
 csvInput.addEventListener('change', function () {
 const f = csvInput.files && csvInput.files[0];
 if (!f) return;
 const reader = new FileReader();
 reader.onload = function () {
 const evs = CSV.parse(String(reader.result || ''));
 let added = 0;
 for (const ev of evs) {
 const cat = Categories.categorize(ev.title);
 const before = planner.all().length;
 planner.add({ title: ev.title, date: ev.date, start: ev.start, end: ev.end, allDay: ev.allDay, cat: cat.cat, color: cat.color });
 if (planner.all().length > before) added++;
 }
 persist(); render();
 toast(' ' + added + ' événement(s) importé(s) depuis ' + f.name, added > 0, added > 0);
 csvInput.value = '';
 };
 reader.readAsText(f);
 });
 document.body.appendChild(csvInput);
 }
 csvInput.click();
 });
 // double-clic sur un jour en vue mois/semaine -> vue jour de ce jour
 document.addEventListener('dblclick', function (e) {
 const cell = e.target && e.target.closest ? e.target.closest('[data-date]') : null;
 if (cell && cell.getAttribute('data-date') && (view === 'month' || view === 'week')) {
 currentDay = cell.getAttribute('data-date');
 setView('day');
 }
 });
 $('fp-print').addEventListener('click', function () { window.print(); });
 els.repeatTomorrow.addEventListener('click', function () {
 if (!editingId) { toast('Ouvre un événement d abord', true); return; }
 const src = planner.all().find(e => e.id === editingId);
 if (!src || !src.date) { toast('Pas de date', true); return; }
 const tomorrow = Planner.addDaysISO(src.date, 1);
 const cat = Categories.categorize(src.title);
 planner.add({ title: src.title, date: tomorrow, start: src.start, end: src.end, allDay: src.allDay, cat: src.cat || cat.cat, color: src.color || cat.color, notes: src.notes });
 persist();
 render();
 toast(' « ' + src.title + ' » recopié le ' + fmtDate(tomorrow), false, true);
 });
 els.mSave.addEventListener('click', saveModal);
 els.mCancel.addEventListener('click', closeModal);
 els.mDelete.addEventListener('click', deleteModal);
 $('fp-modal-close').addEventListener('click', closeModal);
 document.addEventListener('keydown', function (e) {
 if (e.key === 'Escape') {
 if (!els.modal.hidden) { closeModal(); return; }
 if (activeCat) { activeCat = null; render(); toast(' Mode focus désactivé'); return; }
 if (!els.menuPanel.hidden) els.menuPanel.hidden = true;
 }
 // raccourcis : ←/→ = semaine/jour précédent/suivant ; ? = aide raccourcis
 if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
 if (e.key === 't' || e.key === 'T') { currentWeekStart = Planner.weekStartISO(null); currentDay = Parser.todayISO(new Date()); renderView(); renderStats(); return; }
 if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
 if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
 if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); toast('⌨ Raccourcis : ←/→ changer de période · Ctrl+Z annuler · Échap fermer/quitter focus · Ctrl+Entrée générer', false); }
 });
 for (const ex of document.querySelectorAll('.fp-example')) {
 ex.addEventListener('click', function () {
 els.input.value = ex.getAttribute('data-example');
 setStatus('Exemple chargé — clique sur Générer ');
 });
 }


 // ---------- écran d'accueil (une seule fois) ----------
 function maybeShowWelcome() {
 let seen = false;
 try { seen = localStorage.getItem('flowplan.welcome') === '1'; } catch (e) {}
 if (!seen && !Vault.isEnabled(localStorage)) {
 els.welcome.hidden = false;
 els.welcome.classList.add('open');
 }
 }
 els.welcomeGo.addEventListener('click', function () {
 els.welcome.classList.remove('open');
 els.welcome.hidden = true;
 try { localStorage.setItem('flowplan.welcome', '1'); } catch (e) {}
 });

 // 1) données de démo
 els.demo.addEventListener('click', function () {
 els.menuPanel.hidden = true;
 const monday = Planner.weekStartISO(null);
 const demo = [
 ['Lundi 9h00 réunion équipe', 0, '09:00', '10:00', 'travail'],
 ['Lundi 12h30 déjeuner avec Sam', 0, '12:30', '13:30', 'perso'],
 ['Lundi 18h30 sport salle', 0, '18:30', '19:30', 'sport'],
 ['Mardi 10h00 visio client Durand', 1, '10:00', '11:00', 'travail'],
 ['Mardi 19h00 cinéma', 1, '19:00', '21:00', 'perso'],
 ['Mercredi 14h30 dentiste', 2, '14:30', '15:30', 'sante'],
 ['Jeudi 9h00 envoi du devis', 3, '09:00', '09:30', 'travail'],
 ['Vendredi 18h00 apéro équipe', 4, '18:00', '20:00', 'travail'],
 ['Samedi 10h00 brunch', 5, '10:00', '12:00', 'perso'],
 ['Samedi mariage de Julie', 5, null, null, 'perso'],
 ['Dimanche 11h00 courses', 6, '11:00', '12:00', 'courses'],
 ];
 // démo progressive aussi : un par un, animé + parlé
 let i = 0;
 els.menuPanel.hidden = true;
 function stepDemo() {
 if (i >= demo.length) {
 persist();
 toast(' ' + demo.length + ' événements de démo ajoutés — Annuler pour revenir en arrière', false, true);
 return;
 }
 const [title, dayOffset, start, end, cat] = demo[i++];
 const rule = Categories.RULES.find(r => r.cat === cat);
 const added = planner.add({
 title: title.replace(/^\w+ \d+h\d{2} /, ''),
 date: Planner.addDaysISO(monday, dayOffset),
 start: start, end: end,
 allDay: !start,
 cat: cat, color: rule ? rule.color : null,
 });
 persist();
 render();
 const card = document.querySelector('.fp-event[data-id="' + added.id + '"]');
 if (card) {
 card.classList.add('just-added');
 try { const r = card.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, cat.color || '#5b8cff'); } catch (e) {}
 if (window.Animation && card.animate) {
 try {
 card.animate(
 [{ opacity: 0, transform: 'scale(.3) translateY(18px)' }, { opacity: 1, transform: 'scale(1.12)' }, { opacity: 1, transform: 'scale(1)' }],
 { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' }
 );
 } catch (e) {}
 }
 }
 if (voiceEnabled()) speak(added.title, { rate: 1.25 });
 setStatus(' ' + i + '/' + demo.length);
 setTimeout(stepDemo, 950);
 }
 stepDemo();
 });

 // 4) mode présentation : plein écran, cache hero/menus, Échap/F11 pour quitter
 function setPresent(on) {
 document.body.classList.toggle('presenting', on);
 els.present.textContent = on ? ' Quitter la présentation (Échap)' : ' Mode présentation';
 // PAS de requestFullscreen automatique : en fullscreen, Échap est volé par le navigateur.
 // L'utilisateur peut appuyer sur F11 lui-même pour le vrai plein écran.
 if (!on && document.fullscreenElement) document.exitFullscreen().catch(function(){});
 }
 // BUG FIX : en plein écran, Échap est intercepté par le navigateur (sortie fullscreen)
 // et n'atteint jamais la page -> on écoute fullscreenchange pour quitter la présentation aussi.
 document.addEventListener('fullscreenchange', function () {
 if (!document.fullscreenElement && document.body.classList.contains('presenting')) {
 setPresent(false);
 render();
 void document.body.offsetHeight;
 }
 });
 els.present.addEventListener('click', function () {
 els.menuPanel.hidden = true;
 setPresent(!document.body.classList.contains('presenting'));
 });
 document.addEventListener('keydown', function (e) {
 if ((e.key === 'Escape' || e.key === 'F11') && document.body.classList.contains('presenting')) {
 e.preventDefault();
 setPresent(false);
 // purge tout résidu visuel : re-render complet + reflow forcé
 render();
 void document.body.offsetHeight;
 }
 });
 // en présentation : double-clic sur un jour -> zoom vue jour plein écran (interactif)
 document.addEventListener('dblclick', function (e) {
 if (!document.body.classList.contains('presenting')) return;
 const cell = e.target && e.target.closest ? e.target.closest('[data-date]') : null;
 if (cell && cell.getAttribute('data-date')) {
 currentDay = cell.getAttribute('data-date');
 setView('day');
 toast(' Zoom sur le ' + fmtDate(currentDay) + ' — Échap pour revenir à la semaine', false);
 }
 });


 // ---------- voix d'accueil (TTS local, speechSynthesis) ----------
 let bestVoice = null;
 function pickBestVoice() {
 if (!('speechSynthesis' in window)) return null;
 const voices = speechSynthesis.getVoices();
 const fr = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
 if (!fr.length) return null;
 // priorité : voix neuronales/cloud (nettement meilleures), puis noms connus, puis local
 const score = v => {
 const n = (v.name + ' ' + (v.voiceURI || '')).toLowerCase();
 let sc = 0;
 if (n.includes('neural') || n.includes('online') || n.includes('cloud') || n.includes('wavenet')) sc += 100;
 if (n.includes('hortense') || n.includes('denise') || n.includes('google') || n.includes('paul') || n.includes('lea')) sc += 50;
 if (n.includes('natural')) sc += 30;
 if (v.localService === false) sc += 10; // voix en ligne = souvent meilleure
 if (n.includes('microsoft')) sc += 20;
 return sc;
 };
 fr.sort((a, b) => score(b) - score(a));
 bestVoice = fr[0];
 return bestVoice;
 }
 if ('speechSynthesis' in window) {
 pickBestVoice();
 speechSynthesis.onvoiceschanged = pickBestVoice; // les voix arrivent parfois en async
 }
 function speak(text, opts) {
 if (!('speechSynthesis' in window)) return false;
 try {
 const u = new SpeechSynthesisUtterance(text);
 u.lang = 'fr-FR';
 u.rate = (opts && opts.rate) || 1.0;
 u.pitch = (opts && opts.pitch) || 1.0;
 if (!bestVoice) pickBestVoice();
 if (bestVoice) u.voice = bestVoice;
 // JAMAIS de cancel() ici : une séquence en cours serait coupée.
 // cancel() uniquement via stopVoice() (toggle off / reset).
 speechSynthesis.speak(u); // file d'attente native du navigateur
 return true;
 } catch (e) { return false; }
 }
 function voiceEnabled() {
 try { return localStorage.getItem('flowplan.voice') !== '0'; } catch (e) { return true; }
 }
 function stopVoice() {
 if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
 }
 function voiceWelcome() {
 const today = new Date();
 const dayName = DAYS_FR[(today.getDay() + 6) % 7];
 const n = planner.all().filter(e => e.date === Parser.todayISO(today)).length;
 const msg = n > 0
 ? 'Bonjour ! Nous sommes ' + dayName + '. Tu as ' + n + (n > 1 ? ' rendez-vous' : ' rendez-vous') + ' aujourd hui. Que veux-tu ajouter ou changer ?'
 : 'Bonjour ! Nous sommes ' + dayName + '. Ta journée est libre. Dis-moi ce que tu veux planifier.';
 if (speak(msg)) toast(' ' + msg, false);
 else toast(msg, false);
 }
 function refreshVoiceToggle() {
 els.voiceToggle.textContent = voiceEnabled() ? ' Voix : activée' : ' Voix : désactivée';
 }
 refreshVoiceToggle();
 const TEXTS = ['s', 'm', 'l', 'xl'];
 const TEXTNAMES = { s: 'S', m: 'M', l: 'L', xl: 'XL' };
 function curText() { try { return localStorage.getItem('flowplan.text') || 'm'; } catch (e) { return 'm'; } }
 function applyText() {
 document.documentElement.setAttribute('data-text', curText());
 els.textsize.textContent = ' Taille du texte : ' + TEXTNAMES[curText()];
 }
 applyText();
 els.textsize.addEventListener('click', function () {
 const i = TEXTS.indexOf(curText());
 const next = TEXTS[(i + 1) % TEXTS.length];
 try { localStorage.setItem('flowplan.text', next); } catch (e) {}
 applyText();
 toast(' Texte : ' + TEXTNAMES[next]);
 });
 // POINT 49: lis-moi ma journée
 els.readDay.addEventListener('click', function () {
 els.menuPanel.hidden = true;
 const today = Parser.todayISO(new Date());
 const evs = planner.byDate(today).filter(e => !e.allDay).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
 const allDay = planner.byDate(today).filter(e => e.allDay);
 let msg;
 if (!evs.length && !allDay.length) msg = 'Ta journée est libre aujourd hui. Aucun rendez-vous.';
 else {
 const parts = [];
 if (allDay.length) parts.push(allDay.length + ' événement toute la journée : ' + allDay.map(e => e.title).join(', '));
 parts.push(evs.length + ' rendez-vous : ' + evs.map(e => e.start + ' ' + e.title).join(', '));
 msg = 'Aujourd hui, ' + parts.join('. ');
 }
 if (voiceEnabled()) speak(msg, { rate: 1.05 });
 toast(' ' + msg, false);
 });
 // POINT 34: export JSON
 els.exportJson.addEventListener('click', function () {
 els.menuPanel.hidden = true;
 const blob = new Blob([JSON.stringify({ app: 'FlowPlan', version: 1, exportedAt: new Date().toISOString(), events: planner.all() }, null, 2)], { type: 'application/json' });
 const a = document.createElement('a');
 a.href = URL.createObjectURL(blob);
 a.download = 'flowplan-' + new Date().toISOString().slice(0, 10) + '.json';
 document.body.appendChild(a);
 a.click();
 setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 100);
 toast(' Export JSON téléchargé ');
 });
 els.voiceToggle.addEventListener('click', function () {
 try { localStorage.setItem('flowplan.voice', voiceEnabled() ? '0' : '1'); } catch (e) {}
 refreshVoiceToggle();
 if (!voiceEnabled()) stopVoice();
 toast(voiceEnabled() ? ' Voix activée' : ' Voix désactivée');
 });
 // bouton voix d'accueil dans le menu
 document.getElementById('fp-voice-welcome').addEventListener('click', function () {
 els.menuPanel.hidden = true;
 voiceWelcome();
 // après l'annonce, on écoute et on remplit le champ (si STT dispo)
 setTimeout(function () {
 if (Voice.isSupported()) {
 els.input.focus();
 setStatus(' Je t écoute… dis ce que tu veux changer.');
 els.btnVoice.click(); // réutilise le micro existant
 }
 }, msg.length * 90 + 800);
 });


 // ---------- WOW : confettis d'ajout (léger, canvas plein écran temporaire) ----------
 let fxCanvas = null;
 function burst(x, y, color) {
 if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 if (!fxCanvas) {
 fxCanvas = document.createElement('canvas');
 fxCanvas.className = 'fp-fx';
 fxCanvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999';
 document.body.appendChild(fxCanvas);
 }
 const c = fxCanvas;
 c.width = innerWidth; c.height = innerHeight;
 const ctx = c.getContext('2d');
 const parts = [];
 for (let i = 0; i < 30; i++) {
 const a = Math.random() * Math.PI * 2;
 const v = 1 + Math.random() * 2.5;
 parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, color: color || '#5b8cff', size: 2 + Math.random() * 3 });
 }
 let frames = 0;
 function tick() {
 ctx.clearRect(0, 0, c.width, c.height);
 let alive = false;
 for (const p of parts) {
 p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.life -= 0.012;
 if (p.life > 0) {
 alive = true;
 ctx.globalAlpha = Math.max(0, p.life);
 ctx.fillStyle = p.color;
 ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
 }
 }
 if (alive && frames++ < 90) requestAnimationFrame(tick);
 else ctx.clearRect(0, 0, c.width, c.height);
 }
 requestAnimationFrame(tick);
 }


 // ---------- POINT 1 : autocomplétion du champ (basée sur les titres existants) ----------
 let autoList = null, autoIdx = -1;
 function setupAutocomplete() {
 autoList = document.createElement('div');
 autoList.className = 'fp-auto';
 autoList.hidden = true;
 (els.input.parentNode || document.body).appendChild(autoList);
 els.input.addEventListener('input', function () {
 const q = els.input.value.trim().toLowerCase();
 if (q.length < 2) { autoList.hidden = true; return; }
 const titles = [...new Set(planner.all().map(e => e.title))];
 const matches = titles.filter(t => t.toLowerCase().includes(q) && t.toLowerCase() !== q).slice(0, 5);
 if (!matches.length) { autoList.hidden = true; return; }
 autoList.innerHTML = '';
 autoIdx = -1;
 matches.forEach(t => {
 const b = document.createElement('button');
 b.type = 'button';
 b.className = 'fp-auto-item';
 b.textContent = t;
 b.addEventListener('mousedown', function (e) {
 e.preventDefault();
 els.input.value = t;
 autoList.hidden = true;
 });
 autoList.appendChild(b);
 });
 autoList.hidden = false;
 });
 els.input.addEventListener('keydown', function (e) {
 if (autoList.hidden) return;
 const items = autoList.querySelectorAll('.fp-auto-item');
 if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
 e.preventDefault();
 autoIdx = e.key === 'ArrowDown' ? Math.min(autoIdx + 1, items.length - 1) : Math.max(autoIdx - 1, 0);
 items.forEach((it, i) => it.classList.toggle('active', i === autoIdx));
 } else if (e.key === 'Enter' && autoIdx >= 0 && items[autoIdx]) {
 e.preventDefault();
 els.input.value = items[autoIdx].textContent;
 autoList.hidden = true;
 } else if (e.key === 'Escape') {
 autoList.hidden = true;
 }
 });
 document.addEventListener('click', function (e) {
 if (!autoList.contains(e.target) && e.target !== els.input) autoList.hidden = true;
 });
 }
 setupAutocomplete();

 // ripple au clic sur tous les .fp-btn
 document.addEventListener('click', function (e) {
 const b = e.target && e.target.closest ? e.target.closest('.fp-btn') : null;
 if (b) { b.classList.remove('ripple'); void b.offsetWidth; b.classList.add('ripple'); }
 });

 // horloge en direct
 function tickClock() {
 if (!els.clock) return;
 const d = new Date();
 els.clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
 }
 setInterval(tickClock, 1000);
 tickClock();

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
 maybeShowWelcome();
 setStatus(' Déverrouillé.');
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
 maybeShowWelcome();
 // VOIX AUTO au lancement (désactivable dans le menu)
 if (voiceEnabled() && 'speechSynthesis' in window) {
 setTimeout(voiceWelcome, 600);
 }
 }

 boot();
})();

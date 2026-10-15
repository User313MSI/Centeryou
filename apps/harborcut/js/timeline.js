const Timeline = (() => {
  const rulerEl = document.getElementById('ruler');
  const tracksEl = document.getElementById('tracks');
  let pxPerSec = 60;
  let selectedId = null;
  let snapping = true;

  const fmt = (t) => {
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), ms = Math.floor((t % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  function timeToX(t) { return t * pxPerSec; }
  function xToTime(x) { return Math.max(0, x / pxPerSec); }

  function snap(time, excludeClipId) {
    if (!snapping) return time;
    const candidates = [0];
    for (const t of HarborState.state.tracks) {
      for (const c of t.clips) {
        if (c.id === excludeClipId) continue;
        candidates.push(c.start, c.start + c.duration);
      }
    }
    let best = time, bestDist = 8 / pxPerSec;
    for (const cand of candidates) {
      const d = Math.abs(cand - time);
      if (d < bestDist) { bestDist = d; best = cand; }
    }
    return best;
  }

  function renderRuler() {
    rulerEl.innerHTML = '';
    const total = Math.max(60, HarborState.state.duration + 30);
    const steps = [0.5, 1, 2, 5, 10, 30, 60, 120, 300];
    let step = steps.find((s) => s * pxPerSec >= 70) || 300;
    for (let t = 0; t <= total; t += step) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = timeToX(t) + 'px';
      rulerEl.appendChild(tick);
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.style.left = timeToX(t) + 'px';
      label.textContent = fmt(t).slice(3, 8);
      rulerEl.appendChild(label);
    }
  }

  function renderTracks() {
    tracksEl.innerHTML = '';
    for (const track of HarborState.state.tracks) {
      const row = document.createElement('div');
      row.className = 'track';

      const header = document.createElement('div');
      header.className = 'track-header';
      header.innerHTML = `<span class="t-name">${escapeHtml(track.name)}</span><span class="t-kind">${track.kind}</span>`;

      const lane = document.createElement('div');
      lane.className = 'track-lane';
      lane.dataset.trackId = track.id;
      lane.style.width = timeToX(Math.max(60, HarborState.state.duration + 30)) + 'px';

      for (const clip of track.clips) {
        lane.appendChild(renderClip(clip, track));
      }

      row.appendChild(header);
      row.appendChild(lane);
      tracksEl.appendChild(row);
    }
    renderPlayhead();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderClip(clip, track) {
    const media = HarborState.state.media.find((m) => m.id === clip.mediaId);
    const el = document.createElement('div');
    el.className = `clip clip-${media ? media.type : 'text'}${clip.id === selectedId ? ' selected' : ''}`;
    el.dataset.clipId = clip.id;
    el.style.left = timeToX(clip.start) + 'px';
    el.style.width = Math.max(4, timeToX(clip.duration)) + 'px';

    const label = document.createElement('div');
    label.className = 'clip-label';
    label.textContent = clip.name || 'clip';
    el.appendChild(label);

    if (clip.fadeIn > 0) {
      const f = document.createElement('div');
      f.className = 'clip-fade';
      f.style.left = '0';
      f.style.width = timeToX(clip.fadeIn) + 'px';
      el.appendChild(f);
    }
    if (clip.fadeOut > 0) {
      const f = document.createElement('div');
      f.className = 'clip-fade out';
      f.style.width = timeToX(clip.fadeOut) + 'px';
      el.appendChild(f);
    }
    return el;
  }

  function renderPlayhead() {
    let ph = tracksEl.querySelector('#playhead');
    if (!ph) {
      ph = document.createElement('div');
      ph.id = 'playhead';
      tracksEl.appendChild(ph);
    }
    ph.style.left = timeToX(App.playhead) + 'px';
  }

  function setZoom(v) {
    pxPerSec = Math.max(10, Math.min(400, v));
    renderRuler();
    renderTracks();
  }

  function select(clipId) {
    selectedId = clipId;
    renderTracks();
  }
  function getSelected() { return selectedId; }
  function setSnapping(v) { snapping = v; }

  document.addEventListener('mousedown', (e) => {
    const clipEl = e.target.closest('.clip');
    if (clipEl) {
      select(clipEl.dataset.clipId);
      startDrag(clipEl, e);
      App.renderInspector();
      e.preventDefault();
      return;
    }
    const lane = e.target.closest('.track-lane');
    if (lane) {
      const rect = lane.getBoundingClientRect();
      App.setPlayhead(snap(xToTime(e.clientX - rect.left + lane.scrollLeft), null));
      select(null);
      App.renderInspector();
    }
  });

  function startDrag(clipEl, e) {
    const clipId = clipEl.dataset.clipId;
    const found = Engine.findClip(clipId);
    if (!found) return;
    const startX = e.clientX;
    const origStart = found.clip.start;
    let moved = false;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 2) moved = true;
      const newStart = snap(Math.max(0, origStart + dx / pxPerSec), clipId);
      Engine.moveClip(clipId, newStart);
      clipEl.style.left = timeToX(newStart) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (moved) HarborState.notify();
      App.renderInspector();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return {
    renderRuler, renderTracks, renderPlayhead, setZoom,
    select, getSelected, setSnapping, timeToX, xToTime, snap, fmt,
  };
})();
window.Timeline = Timeline;

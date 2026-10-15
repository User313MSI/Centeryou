const Timeline = (() => {
  const rulerEl = document.getElementById('ruler');
  const tracksEl = document.getElementById('tracks');
  const HEADER_W = 110;
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

  function laneWidth() {
    return timeToX(Math.max(60, HarborState.state.duration + 30));
  }

  function renderRuler() {
    rulerEl.innerHTML = '';
    const total = Math.max(60, HarborState.state.duration + 30);
    const steps = [0.5, 1, 2, 5, 10, 30, 60, 120, 300];
    let step = steps.find((s) => s * pxPerSec >= 70) || 300;
    for (let t = 0; t <= total; t += step) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = (HEADER_W + timeToX(t)) + 'px';
      rulerEl.appendChild(tick);
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.style.left = (HEADER_W + timeToX(t)) + 'px';
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
      lane.style.width = (HEADER_W + laneWidth()) + 'px';

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

    // trim handles
    const hL = document.createElement('div');
    hL.className = 'clip-handle clip-handle-l';
    hL.dataset.clipId = clip.id;
    hL.dataset.handle = 'l';
    el.appendChild(hL);
    const hR = document.createElement('div');
    hR.className = 'clip-handle clip-handle-r';
    hR.dataset.clipId = clip.id;
    hR.dataset.handle = 'r';
    el.appendChild(hR);

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
    const x = HEADER_W + timeToX(Number.isFinite(App.playhead()) ? App.playhead() : 0);
    ph.style.left = Math.max(HEADER_W, x) + 'px';
    ph.style.height = tracksEl.scrollHeight + 'px';
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
    const handle = e.target.closest('.clip-handle');
    if (handle) {
      e.preventDefault();
      e.stopPropagation();
      select(handle.dataset.clipId);
      startTrim(handle, e);
      return;
    }
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
      const t = xToTime(e.clientX - rect.left);
      App.setPlayhead(snap(Math.max(0, t), null));
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

  function startTrim(handle, e) {
    const clipId = handle.dataset.clipId;
    const side = handle.dataset.handle;
    const found = Engine.findClip(clipId);
    if (!found) return;
    const startX = e.clientX;
    const orig = { start: found.clip.start, duration: found.clip.duration, offset: found.clip.offset };
    const minDur = 3 / pxPerSec;

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / pxPerSec;
      if (side === 'l') {
        let newStart = snap(Math.max(0, orig.start + dx), clipId);
        let newDur = orig.duration - (newStart - orig.start);
        if (newDur < minDur) { newDur = minDur; newStart = orig.start + orig.duration - minDur; }
        const deltaStart = newStart - orig.start;
        Engine.updateClip(clipId, {
          start: Math.max(0, newStart),
          duration: newDur,
          offset: Math.max(0, orig.offset + deltaStart * found.clip.speed),
        });
      } else {
        let newEnd = snap(orig.start + orig.duration + dx, clipId);
        let newDur = Math.max(minDur, newEnd - orig.start);
        Engine.updateClip(clipId, { duration: newDur });
      }
      const el = document.querySelector(`.clip[data-clip-id="${clipId}"]`);
      if (el) {
        el.style.left = timeToX(found.clip.start) + 'px';
        el.style.width = Math.max(4, timeToX(found.clip.duration)) + 'px';
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      HarborState.notify();
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

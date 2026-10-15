const App = (() => {
  let playhead = 0;
  let playing = false;
  let raf = null;
  let lastTick = 0;
  let selectedForInspector = null;

  const $ = (id) => document.getElementById(id);
  const previewCanvas = $('preview-canvas');
  Preview.resize(1280, 720);

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 2200);
  }

  function setPlayhead(t) {
    playhead = Math.max(0, t);
    updateTimecode();
    Timeline.renderPlayhead();
    Preview.drawFrame(playhead);
    if (playing) Preview.playAudio(playhead);
  }

  function updateTimecode() {
    $('timecode').textContent = Timeline.fmt(playhead);
  }

  function play() {
    playing = true;
    $('btn-play').textContent = '⏸';
    lastTick = performance.now();
    const loop = (now) => {
      if (!playing) return;
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      if (playhead >= HarborState.state.duration && HarborState.state.duration > 0) {
        pause();
        return;
      }
      setPlayhead(playhead + dt);
      Preview.drawFrame(playhead);
      Preview.playAudio(playhead);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    playing = false;
    $('btn-play').textContent = '▶';
    Preview.pauseAll();
    if (raf) cancelAnimationFrame(raf);
  }

  async function importFiles(files) {
    let imported = 0;
    for (const file of files) {
      if (!/^(video|audio|image)\//.test(file.type)) continue;
      const media = Engine.addMedia(file);
      HarborState.mutate((s) => s.media.push(media), { undoable: false });
      await Engine.probeDuration(media);
      imported++;
    }
    renderPool();
    if (imported) toast(`${imported} file(s) imported`);
    else toast('No supported media found');
    HarborState.notify();
  }

  function renderPool() {
    const pool = $('pool');
    pool.innerHTML = '';
    for (const media of HarborState.state.media) {
      const item = document.createElement('div');
      item.className = 'pool-item';
      item.draggable = true;
      item.dataset.mediaId = media.id;
      const icon = media.type === 'video' ? '🎬' : media.type === 'audio' ? '🎵' : '🖼';
      item.innerHTML = `<div class="pool-thumb">${icon}</div>
        <div style="min-width:0">
          <div class="pool-name">${escapeHtml(media.name)}</div>
          <div class="pool-meta">${media.type} · ${media.duration ? media.duration.toFixed(1) + 's' : '—'}</div>
        </div>`;
      item.addEventListener('dblclick', () => {
        const track = HarborState.state.tracks.find((t) => t.kind === (media.type === 'audio' ? 'audio' : 'video'));
        if (!track) return;
        let end = 0;
        for (const c of track.clips) end = Math.max(end, c.start + c.duration);
        Engine.addClip(track.id, media, end);
        toast(`Added ${media.name} to ${track.name}`);
      });
      pool.appendChild(item);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderInspector() {
    const sel = Timeline.getSelected();
    const panel = $('inspector');
    if (!sel) {
      panel.innerHTML = '<div class="inspector-empty">Select a clip to edit its properties</div>';
      return;
    }
    const found = Engine.findClip(sel);
    if (!found) { panel.innerHTML = ''; return; }
    const c = found.clip;
    panel.innerHTML = `
      <div class="insp-title">${escapeHtml(c.name)}</div>
      <div class="insp-row"><label>Start</label><input type="number" step="0.1" id="insp-start" value="${c.start.toFixed(2)}"></div>
      <div class="insp-row"><label>Duration</label><input type="number" step="0.1" id="insp-duration" value="${c.duration.toFixed(2)}"></div>
      <div class="insp-row"><label>Volume</label><input type="range" id="insp-volume" min="0" max="2" step="0.05" value="${c.volume}"><span class="insp-value" id="vol-val">${Math.round(c.volume * 100)}%</span></div>
      <div class="insp-row"><label>Opacity</label><input type="range" id="insp-opacity" min="0" max="1" step="0.05" value="${c.opacity}"><span class="insp-value" id="op-val">${Math.round(c.opacity * 100)}%</span></div>
      <div class="insp-row"><label>Scale</label><input type="range" id="insp-scale" min="0.2" max="3" step="0.05" value="${c.scale}"><span class="insp-value" id="sc-val">${Math.round(c.scale * 100)}%</span></div>
      <div class="insp-row"><label>Speed</label><input type="number" id="insp-speed" step="0.25" min="0.25" max="4" value="${c.speed}"></div>
      <div class="insp-row"><label>Rotation</label><input type="number" id="insp-rotation" step="15" value="${c.rotation}"></div>
      <div class="insp-row"><label>Position X</label><input type="number" id="insp-x" step="10" value="${c.x}"></div>
      <div class="insp-row"><label>Position Y</label><input type="number" id="insp-y" step="10" value="${c.y}"></div>
      <div class="insp-row"><label>Fade In (s)</label><input type="number" id="insp-fadein" step="0.25" min="0" value="${c.fadeIn}"></div>
      <div class="insp-row"><label>Fade Out (s)</label><input type="number" id="insp-fadeout" step="0.25" min="0" value="${c.fadeOut}"></div>
      ${found.track.kind === 'video' ? `
      <div class="insp-row"><label>Text Overlay</label><input type="text" id="insp-text" value="${c.text ? escapeHtml(c.text) : ''}" placeholder="none"></div>
      <div class="insp-row"><label>Text Color</label><input type="color" id="insp-color" value="${c.color || '#ffffff'}"></div>` : ''}
    `;

    const bind = (id, prop, transform = (v) => v, isNum = true) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = isNum ? parseFloat(el.value) || 0 : el.value;
        Engine.updateClip(sel, { [prop]: transform(v) });
        const valEl = el.parentElement.querySelector('.insp-value');
        if (valEl && ['volume', 'opacity', 'scale'].includes(prop)) valEl.textContent = Math.round(v * 100) + '%';
        Timeline.renderTracks();
        Preview.drawFrame(playhead);
      });
    };
    bind('insp-start', 'start');
    bind('insp-duration', 'duration');
    bind('insp-volume', 'volume');
    bind('insp-opacity', 'opacity');
    bind('insp-scale', 'scale');
    bind('insp-speed', 'speed');
    bind('insp-rotation', 'rotation');
    bind('insp-x', 'x');
    bind('insp-y', 'y');
    bind('insp-fadein', 'fadeIn');
    bind('insp-fadeout', 'fadeOut');
    const textEl = $('insp-text');
    if (textEl) textEl.addEventListener('input', () => Engine.updateClip(sel, { text: textEl.value || null }));
    const colorEl = $('insp-color');
    if (colorEl) colorEl.addEventListener('input', () => Engine.updateClip(sel, { color: colorEl.value }));
  }

  async function exportVideo() {
    if (!HarborState.state.media.length) {
      toast('Import media first');
      return;
    }
    pause();
    toast('Rendering… do not close the window');
    const stream = previewCanvas.captureStream(30);
    const chunks = [];
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const done = new Promise((resolve) => { rec.onstop = resolve; });
    rec.start(250);

    const fps = 30;
    const total = HarborState.state.duration;
    const stepMs = 1000 / fps;
    for (let t = 0; t < total; t += 1 / fps) {
      Preview.drawFrame(t);
      await new Promise((r) => setTimeout(r, stepMs / 4));
    }
    rec.stop();
    await done;

    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harborcut-export.webm';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Export finished');
  }

  async function saveProject() {
    const data = Engine.exportProject();
    if (window.harborcut) {
      const res = await window.harborcut.saveProject('project.hcproj', data);
      if (res.ok) toast(`Saved (${(res.bytes / 1024).toFixed(1)} KB)`);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.hcproj';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Project downloaded');
  }

  async function openProject() {
    if (window.harborcut) {
      const res = await window.harborcut.openProject();
      if (!res.ok) { if (res.error) toast(res.error); return; }
      try {
        HarborState.loadProject(res.data);
        renderPool();
        Timeline.renderRuler();
        Timeline.renderTracks();
        toast('Project loaded');
      } catch (e) {
        toast('Invalid project');
      }
      return;
    }
    toast('Open is available in the desktop app');
  }

  function addTextClip() {
    const track = HarborState.state.tracks.find((t) => t.kind === 'video');
    if (!track) return;
    const media = { id: 'text_' + Date.now(), name: 'Text', type: 'text', url: null, duration: 4 };
    HarborState.mutate((s) => s.media.push(media), { undoable: false });
    const clip = Engine.addClip(track.id, media, playhead, { text: 'TITLE', duration: 4 });
    Timeline.select(clip.id);
    renderInspector();
    toast('Text added at playhead');
  }

  function initShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); playing ? pause() : play(); }
      else if (k === 's') doSplit();
      else if (k === 'delete' || k === 'backspace') {
        const sel = Timeline.getSelected();
        if (sel) { Engine.deleteClip(sel); Timeline.select(null); renderInspector(); }
      }
      else if (k === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.shiftKey ? HarborState.redo() : HarborState.undo();
      }
      else if (k === 't') addTextClip();
      else if (k === 'arrowleft') setPlayhead(playhead - (e.shiftKey ? 1 : 1 / 30));
      else if (k === 'arrowright') setPlayhead(playhead + (e.shiftKey ? 1 : 1 / 30));
    });
  }

  function doSplit() {
    const sel = Timeline.getSelected();
    if (!sel) { toast('Select a clip to split'); return; }
    const res = Engine.splitClip(sel, playhead);
    if (res) { toast('Clip split'); Timeline.select(null); renderInspector(); }
    else toast('Playhead must be inside the clip');
  }

  function init() {
    $('btn-import').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'video/*,audio/*,image/*';
      input.onchange = () => importFiles([...input.files]);
      input.click();
    });

    $('btn-play').addEventListener('click', () => (playing ? pause() : play()));
    $('btn-skip-back').addEventListener('click', () => setPlayhead(0));
    $('btn-skip-end').addEventListener('click', () => setPlayhead(HarborState.state.duration));
    $('btn-prev-frame').addEventListener('click', () => setPlayhead(playhead - 1 / 30));
    $('btn-next-frame').addEventListener('click', () => setPlayhead(playhead + 1 / 30));

    $('btn-split').addEventListener('click', doSplit);
    $('btn-delete').addEventListener('click', () => {
      const sel = Timeline.getSelected();
      if (sel) { Engine.deleteClip(sel); Timeline.select(null); renderInspector(); }
    });
    $('btn-fade-in').addEventListener('click', () => {
      const sel = Timeline.getSelected();
      if (sel) { Engine.setFade(sel, 'in', 1); Timeline.renderTracks(); }
    });
    $('btn-fade-out').addEventListener('click', () => {
      const sel = Timeline.getSelected();
      if (sel) { Engine.setFade(sel, 'out', 1); Timeline.renderTracks(); }
    });
    $('btn-add-video-track').addEventListener('click', () => Engine.addTrack('video'));
    $('btn-add-audio-track').addEventListener('click', () => Engine.addTrack('audio'));
    $('btn-add-text').addEventListener('click', addTextClip);
    $('snapping').addEventListener('change', (e) => Timeline.setSnapping(e.target.checked));
    $('btn-undo').addEventListener('click', () => HarborState.undo());
    $('btn-redo').addEventListener('click', () => HarborState.redo());
    $('btn-save').addEventListener('click', saveProject);
    $('btn-open').addEventListener('click', openProject);
    $('btn-export').addEventListener('click', exportVideo);
    $('zoom').addEventListener('input', (e) => Timeline.setZoom(parseInt(e.target.value, 10)));

    document.addEventListener('dragover', (e) => { e.preventDefault(); $('drop-overlay').hidden = false; });
    document.addEventListener('dragleave', (e) => { if (e.target === document.documentElement) $('drop-overlay').hidden = true; });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      $('drop-overlay').hidden = true;
      if (e.dataTransfer.files.length) importFiles([...e.dataTransfer.files]);
    });

    HarborState.onChange(() => {
      Timeline.renderRuler();
      Timeline.renderTracks();
      renderPool();
      updateTimecode();
    });

    initShortcuts();
    Preview.drawFrame(0);
    Timeline.renderRuler();
    Timeline.renderTracks();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    setPlayhead, renderInspector, playhead: () => playhead,
  };
})();
window.App = App;

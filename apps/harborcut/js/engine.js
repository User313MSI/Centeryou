const Engine = (() => {
  let idCounter = 1;
  const uid = () => 'c' + (idCounter++) + '_' + Date.now().toString(36);

  function addMedia(file) {
    const media = {
      id: 'm' + (idCounter++),
      name: file.name,
      type: file.type.startsWith('video') ? 'video'
        : file.type.startsWith('audio') ? 'audio'
        : file.type.startsWith('image') ? 'image' : 'unknown',
      url: URL.createObjectURL(file),
      duration: null,
      width: null,
      height: null,
    };
    return media;
  }

  async function probeDuration(media) {
    return new Promise((resolve) => {
      if (media.type === 'image') {
        const img = new Image();
        img.onload = () => {
          media.width = img.naturalWidth;
          media.height = img.naturalHeight;
          media.duration = 5;
          resolve(media);
        };
        img.onerror = () => { media.duration = 5; resolve(media); };
        img.src = media.url;
        return;
      }
      const el = document.createElement(media.type === 'audio' ? 'audio' : 'video');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        media.duration = el.duration || 5;
        if (el.videoWidth) { media.width = el.videoWidth; media.height = el.videoHeight; }
        resolve(media);
      };
      el.onerror = () => { media.duration = 5; resolve(media); };
      el.src = media.url;
    });
  }

  function findClip(id) {
    for (const t of HarborState.state.tracks) {
      const clip = t.clips.find((c) => c.id === id);
      if (clip) return { track: t, clip };
    }
    return null;
  }

  function addClip(trackId, media, start, opts = {}) {
    const track = HarborState.state.tracks.find((t) => t.id === trackId);
    if (!track) return null;
    const clip = {
      id: uid(),
      mediaId: media.id,
      name: media.name,
      start: Math.max(0, start || 0),
      duration: opts.duration || media.duration || 5,
      offset: opts.offset || 0,
      fadeIn: 0,
      fadeOut: 0,
      volume: 1,
      speed: 1,
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      text: opts.text || null,
      color: opts.color || '#ffffff',
    };
    HarborState.mutate((s) => track.clips.push(clip));
    return clip;
  }

  function splitClip(clipId, time) {
    const found = findClip(clipId);
    if (!found) return null;
    const { track, clip } = found;
    if (time <= clip.start + 0.05 || time >= clip.start + clip.duration - 0.05) return null;
    const left = { ...clip, duration: time - clip.start };
    const right = {
      ...clip,
      id: uid(),
      start: time,
      duration: clip.start + clip.duration - time,
      offset: clip.offset + (time - clip.start) * clip.speed,
      fadeIn: 0,
    };
    left.fadeOut = 0;
    HarborState.mutate((s) => {
      const idx = track.clips.indexOf(clip);
      track.clips.splice(idx, 1, left, right);
    });
    return [left, right];
  }

  function deleteClip(clipId) {
    const found = findClip(clipId);
    if (!found) return false;
    HarborState.mutate((s) => {
      const idx = found.track.clips.indexOf(found.clip);
      found.track.clips.splice(idx, 1);
    });
    return true;
  }

  function moveClip(clipId, newStart, newTrackId) {
    const found = findClip(clipId);
    if (!found) return false;
    const { clip } = found;
    const targetTrack = newTrackId
      ? HarborState.state.tracks.find((t) => t.id === newTrackId)
      : found.track;
    if (!targetTrack) return false;
    HarborState.mutate((s) => {
      clip.start = Math.max(0, newStart);
      if (targetTrack !== found.track) {
        const idx = found.track.clips.indexOf(clip);
        found.track.clips.splice(idx, 1);
        targetTrack.clips.push(clip);
      }
    }, { undoable: false });
    return true;
  }

  function updateClip(clipId, props) {
    const found = findClip(clipId);
    if (!found) return false;
    HarborState.mutate((s) => Object.assign(found.clip, props), { undoable: false });
    return true;
  }

  function setFade(clipId, kind, seconds) {
    const found = findClip(clipId);
    if (!found) return false;
    const props = {};
    props[kind === 'in' ? 'fadeIn' : 'fadeOut'] = Math.max(0, Math.min(seconds, found.clip.duration / 2));
    return updateClip(clipId, props);
  }

  function addTrack(kind) {
    const n = HarborState.state.tracks.filter((t) => t.kind === kind).length + 1;
    const track = {
      id: kind[0] + Date.now().toString(36),
      kind,
      name: (kind === 'video' ? 'V' : 'A') + n,
      clips: [],
    };
    HarborState.mutate((s) => s.tracks.push(track));
    return track;
  }

  function exportProject() {
    const s = HarborState.state;
    const out = { version: s.version, tracks: [], media: [] };
    for (const t of s.tracks) {
      out.tracks.push({
        id: t.id, kind: t.kind, name: t.name,
        clips: t.clips.map((c) => ({ ...c })),
      });
    }
    for (const m of s.media) out.media.push({ id: m.id, name: m.name, type: m.type });
    return out;
  }

  return {
    addMedia, probeDuration, addClip, findClip, splitClip, deleteClip,
    moveClip, updateClip, setFade, addTrack, exportProject, uid,
  };
})();
window.Engine = Engine;

const Preview = (() => {
  const canvas = document.getElementById('preview-canvas');
  const ctx = canvas.getContext('2d');
  const mediaEls = new Map();

  function getMediaEl(media) {
    if (mediaEls.has(media.id)) return mediaEls.get(media.id);
    const el = document.createElement(media.type === 'audio' ? 'audio' : 'video');
    if (media.type !== 'image') {
      el.src = media.url;
      el.muted = media.type === 'image';
      el.preload = 'auto';
      el.addEventListener('loadeddata', () => {
        if (typeof App !== 'undefined' && App.playhead) {
          try { drawFrame(App.playhead()); } catch (e) {}
        }
      });
    }
    mediaEls.set(media.id, el);
    return el;
  }

  function resize(w, h) {
    canvas.width = Math.max(2, Math.floor(w));
    canvas.height = Math.max(2, Math.floor(h));
  }

  function drawFrame(time) {
    const s = HarborState.state;
    ctx.fillStyle = '#000';
    if (canvas.width !== ctx.canvas.width) resize(1280, 720);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const videoTracks = s.tracks.filter((t) => t.kind === 'video');
    for (const track of videoTracks) {
      for (const clip of track.clips) {
        if (time < clip.start || time >= clip.start + clip.duration) continue;
        const media = s.media.find((m) => m.id === clip.mediaId);
        if (!media) continue;
        const localTime = clip.offset + (time - clip.start) * clip.speed;

        if (media.type === 'image') {
          const img = getImg(media);
          if (img && img.complete) drawMedia(ctx, img, clip, canvas);
        } else {
          const el = getMediaEl(media);
          if (el.readyState >= 2) drawMedia(ctx, el, clip, canvas);
          if (Math.abs(el.currentTime - localTime) > 0.15 && el.paused) {
            el.currentTime = Math.min(localTime, Math.max(0, (el.duration || localTime) - 0.01));
          }
        }

        if (clip.text) drawText(ctx, clip, canvas);
      }
    }
  }

  function drawMedia(ctx, src, clip, canvas) {
    const sw = src.videoWidth || src.naturalWidth || 0;
    const sh = src.videoHeight || src.naturalHeight || 0;
    if (!sw || !sh) return;
    let dw = canvas.width * clip.scale;
    let dh = (dw * sh) / sw;
    if (dh > canvas.height * clip.scale) { dh = canvas.height * clip.scale; dw = (dh * sw) / sh; }
    const dx = (canvas.width - dw) / 2 + clip.x;
    const dy = (canvas.height - dh) / 2 + clip.y;
    ctx.save();
    ctx.globalAlpha = clip.opacity;
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate((clip.rotation * Math.PI) / 180);
    try { ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh); } catch (e) {}
    ctx.restore();
  }

  function drawText(ctx, clip, canvas) {
    ctx.save();
    ctx.globalAlpha = clip.opacity;
    ctx.font = `800 ${Math.round(canvas.height * 0.08)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = clip.color || '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(clip.text, canvas.width / 2 + clip.x, canvas.height * 0.85 + clip.y);
    ctx.restore();
  }

  function getImg(media) {
    if (media._img) return media._img;
    const img = new Image();
    img.onload = () => {
      if (typeof App !== 'undefined' && App.playhead) {
        try { drawFrame(App.playhead()); } catch (e) {}
      }
    };
    img.src = media.url;
    media._img = img;
    return img;
  }

  function playAudio(time) {
    const s = HarborState.state;
    for (const track of s.tracks) {
      if (track.kind !== 'audio') continue;
      for (const clip of track.clips) {
        const media = s.media.find((m) => m.id === clip.mediaId);
        if (!media || media.type === 'image') continue;
        const el = getMediaEl(media);
        const inRange = time >= clip.start && time < clip.start + clip.duration;
        if (inRange) {
          const local = clip.offset + (time - clip.start) * clip.speed;
          if (el.paused) {
            el.currentTime = local;
            el.volume = clip.volume;
            el.playbackRate = clip.speed;
            el.play().catch(() => {});
          } else if (Math.abs(el.currentTime - local) > 0.25) {
            el.currentTime = local;
          }
        } else if (!el.paused) {
          el.pause();
        }
      }
    }
    for (const track of s.tracks) {
      if (track.kind !== 'video') continue;
      for (const clip of track.clips) {
        const media = s.media.find((m) => m.id === clip.mediaId);
        if (!media || media.type !== 'video') continue;
        const el = getMediaEl(media);
        const inRange = time >= clip.start && time < clip.start + clip.duration;
        if (!inRange && !el.paused) el.pause();
      }
    }
  }

  function pauseAll() {
    for (const el of mediaEls.values()) {
      if (el.pause) el.pause();
    }
  }

  function stopAll() {
    for (const el of mediaEls.values()) {
      if (el.pause) { el.pause(); }
    }
  }

  return { drawFrame, playAudio, pauseAll, stopAll, resize };
})();
window.Preview = Preview;

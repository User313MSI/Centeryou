const Sound = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let currentMood = null;
  let moodTimer = null;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.5;
      musicGain.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.7;
      sfxGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const SCALES = {
    wonder: [220, 261.63, 293.66, 329.63, 392, 440, 523.25],
    tense: [196, 220, 233.08, 261.63, 293.66, 311.13],
    happy: [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33],
    sad: [220, 246.94, 261.63, 293.66, 329.63],
    epic: [130.81, 164.81, 196, 220, 261.63, 329.63],
  };

  function noteFreq(mood, degree, octave = 0) {
    const scale = SCALES[mood] || SCALES.wonder;
    const d = ((degree % scale.length) + scale.length) % scale.length;
    return scale[d] * Math.pow(2, octave);
  }

  function playTone(freq, { dur = 0.5, type = 'sine', gain = 0.3, dest = null, attack = 0.02 } = {}) {
    const c = ensure();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(g).connect(dest || musicGain);
    osc.start();
    osc.stop(c.currentTime + dur + 0.05);
  }

  function playNoise({ dur = 0.2, gain = 0.2, filterFreq = 800 } = {}) {
    const c = ensure();
    const len = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(sfxGain);
    src.start();
  }

  const SFX = {
    chime: () => { playTone(880, { dur: 0.6, gain: 0.15, type: 'sine' }); playTone(1318.5, { dur: 0.8, gain: 0.1, type: 'sine' }); },
    whoosh: () => playNoise({ dur: 0.5, gain: 0.25, filterFreq: 1200 }),
    crash: () => playNoise({ dur: 0.8, gain: 0.5, filterFreq: 400 }),
    sparkle: () => { [1046, 1318, 1568, 2093].forEach((f, i) => setTimeout(() => playTone(f, { dur: 0.3, gain: 0.08 }), i * 60)); },
    thud: () => { playTone(80, { dur: 0.3, type: 'triangle', gain: 0.5 }); playNoise({ dur: 0.15, gain: 0.3, filterFreq: 300 }); },
    wind: () => playNoise({ dur: 1.5, gain: 0.12, filterFreq: 600 }),
    beat: () => { playTone(60, { dur: 0.15, type: 'square', gain: 0.4 }); },
  };

  function setMood(mood) {
    currentMood = mood;
    ensure();
  }

  function startMusic(mood) {
    ensure();
    setMood(mood);
    stopMusic();
    const bassPattern = [0, 0, 4, 0, 2, 0, 4, 5];
    const melPattern = [0, 2, 4, 2, 5, 4, 2, 0, 4, 5, 7, 5, 4, 2, 0, 2];
    let step = 0;
    const tempo = mood === 'epic' ? 280 : mood === 'tense' ? 220 : 400;
    const tick = () => {
      if (!currentMood) return;
      const m = currentMood;
      if (step % 2 === 0) playTone(noteFreq(m, bassPattern[(step / 2) % 8], -2), { dur: 0.5, type: 'triangle', gain: 0.18 });
      playTone(noteFreq(m, melPattern[step % 16], 0), { dur: 0.35, type: mood === 'epic' ? 'sawtooth' : 'sine', gain: 0.07 });
      if (m === 'epic' && step % 4 === 0) SFX.beat();
      step++;
    };
    tick();
    moodTimer = setInterval(tick, tempo);
  }

  function stopMusic() {
    if (moodTimer) { clearInterval(moodTimer); moodTimer = null; }
  }

  return { ensure, SFX, setMood, startMusic, stopMusic, playTone };
})();
window.Sound = Sound;

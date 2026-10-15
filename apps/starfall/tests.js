const fs = require('fs');
const vm = require('vm');
const path = require('path');

const failures = [];
let passes = 0;
function test(name, fn) {
  try { fn(); passes++; } catch (e) { failures.push({ name, err: e.message }); }
}
function assert(c, m) { if (!c) throw new Error(m || 'assert failed'); }

function loadEpisodes() {
  const code = fs.readFileSync(path.join(__dirname, 'episodes.js'), 'utf8');
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox, { filename: 'episodes.js' });
  return sandbox.Episodes;
}

const Eps = loadEpisodes();

test('ep1 loads and has beats', () => {
  const ep = Eps.ep1();
  assert(ep.beats.length > 30, 'ep1 should have many beats, got ' + ep.beats.length);
  assert(ep.duration >= 300, 'ep1 should be ~5 min, got ' + ep.duration);
});

test('ep2 loads and has beats', () => {
  const ep = Eps.ep2();
  assert(ep.beats.length > 30, 'ep2 should have many beats, got ' + ep.beats.length);
  assert(ep.duration >= 300, 'ep2 should be ~5 min, got ' + ep.duration);
});

test('all timed beats within duration', () => {
  for (const ep of [Eps.ep1(), Eps.ep2()]) {
    for (const b of ep.beats) {
      if (typeof b.dur !== 'number') continue;
      assert(b.start + b.dur <= ep.duration + 0.01, `beat at ${b.start}+${b.dur} exceeds duration ${ep.duration}`);
    }
  }
});

test('scenes cover the whole runtime', () => {
  for (const ep of [Eps.ep1(), Eps.ep2()]) {
    const scenes = ep.beats.filter((b) => b.type === 'scene').sort((a, b) => a.start - b.start);
    let covered = 0;
    for (const s of scenes) {
      assert(s.start <= covered + 30, `scene gap too large at ${s.start} (covered=${covered})`);
      covered = Math.max(covered, s.start + s.dur);
    }
    assert(covered >= ep.duration, 'scenes must cover the full duration');
  }
});

test('no overlapping subtitles', () => {
  for (const ep of [Eps.ep1(), Eps.ep2()]) {
    const subs = ep.beats.filter((b) => b.type === 'subtitle').sort((a, b) => a.start - b.start);
    for (let i = 1; i < subs.length; i++) {
      assert(subs[i].start >= subs[i - 1].start + subs[i - 1].dur - 0.01,
        `subtitle overlap: "${subs[i - 1].text.slice(0, 20)}" vs "${subs[i].text.slice(0, 20)}" at ${subs[i].start}`);
    }
  }
});

test('sfx names are valid', () => {
  const valid = ['chime', 'whoosh', 'crash', 'sparkle', 'thud', 'wind', 'beat'];
  for (const ep of [Eps.ep1(), Eps.ep2()]) {
    for (const b of ep.beats) {
      if (b.type === 'sfx') assert(valid.includes(b.name), 'unknown sfx: ' + b.name);
    }
  }
});

test('moods are valid', () => {
  const valid = ['wonder', 'tense', 'happy', 'sad', 'epic'];
  for (const ep of [Eps.ep1(), Eps.ep2()]) {
    for (const b of ep.beats) {
      if (b.type === 'mood') assert(valid.includes(b.mood), 'unknown mood: ' + b.mood);
    }
  }
});

console.log(`Starfall tests: ${passes} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✕ ${f.name}: ${f.err}`);
  process.exit(1);
}
console.log('All Starfall episode tests passed ✔');

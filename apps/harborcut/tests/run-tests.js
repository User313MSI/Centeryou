const fs = require('fs');
const path = require('path');
const vm = require('vm');

const failures = [];
const passes = [];
function test(name, fn) {
  try {
    fn();
    passes.push(name);
  } catch (e) {
    failures.push({ name, error: e.message });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

const srcDir = path.join(__dirname, '..', 'js');

function loadScript(file, sandbox) {
  const code = fs.readFileSync(path.join(srcDir, file), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: file });
}

function makeSandbox() {
  const listeners = [];
  const sandbox = {
    console,
    window: {},
    document: {
      getElementById: () => null,
      createElement: () => ({ style: {}, addEventListener: () => {}, appendChild: () => {} }),
      addEventListener: () => {},
    },
    URL: { createObjectURL: () => 'blob:x' },
    MediaRecorder: undefined,
    performance: { now: () => 0 },
    setTimeout, clearTimeout,
  };
  sandbox.window = sandbox;
  return { sandbox, listeners };
}

console.log('== HarborCut engine tests ==\n');

test('state.js: mutate + recompute duration', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  const S = sandbox.HarborState;
  S.mutate((s) => {
    s.tracks[0].clips.push({ id: 'c1', mediaId: 'm1', start: 0, duration: 10, offset: 0, fadeIn: 0, fadeOut: 0, volume: 1, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, rotation: 0, name: 'a' });
    s.tracks[1].clips.push({ id: 'c2', mediaId: 'm2', start: 5, duration: 8, offset: 0, fadeIn: 0, fadeOut: 0, volume: 1, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, rotation: 0, name: 'b' });
  });
  assert(S.state.duration === 13, 'duration should be 13, got ' + S.state.duration);
});

test('state.js: undo/redo', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  const S = sandbox.HarborState;
  S.mutate((s) => { s.marker = 1; });
  assert(S.state.marker === 1);
  S.undo();
  assert(S.state.marker === undefined, 'undo should revert');
  S.redo();
  assert(S.state.marker === 1, 'redo should restore');
});

test('state.js: undo stack depth capped at 100', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  const S = sandbox.HarborState;
  for (let i = 0; i < 130; i++) S.mutate((s) => { s.n = i; });
  let undos = 0;
  while (S.undo()) undos++;
  assert(undos === 100, 'expected 100 undos, got ' + undos);
});

test('state.js: loadProject rejects invalid data', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  const S = sandbox.HarborState;
  let threw = false;
  try { S.loadProject({ tracks: 'not-an-array' }); } catch (e) { threw = true; }
  assert(threw, 'should throw on invalid project');
});

test('engine.js: addClip appends to track', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const S = sandbox.HarborState, E = sandbox.Engine;
  const media = { id: 'm1', name: 'clip', type: 'video', url: 'blob:x', duration: 5 };
  const clip = E.addClip('v1', media, 2);
  assert(clip && clip.start === 2 && clip.duration === 5, 'clip props wrong');
  assert(S.state.tracks[0].clips.length === 1);
});

test('engine.js: splitClip produces two clips', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const S = sandbox.HarborState, E = sandbox.Engine;
  const media = { id: 'm1', name: 'clip', type: 'video', url: 'blob:x', duration: 10 };
  const clip = E.addClip('v1', media, 0, { duration: 10 });
  const parts = E.splitClip(clip.id, 4);
  assert(parts && parts.length === 2, 'split should return 2 clips');
  assert(parts[0].duration === 4 && parts[1].start === 4, 'left/right bounds wrong');
  assert(parts[1].offset === 4, 'offset should advance');
  assert(S.state.tracks[0].clips.length === 2);
});

test('engine.js: splitClip rejects edges', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const E = sandbox.Engine;
  const media = { id: 'm1', name: 'clip', type: 'video', url: 'blob:x', duration: 10 };
  const clip = E.addClip('v1', media, 0, { duration: 10 });
  assert(E.splitClip(clip.id, 0) === null, 'split at start should fail');
  assert(E.splitClip(clip.id, 10) === null, 'split at end should fail');
});

test('engine.js: deleteClip removes clip', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const S = sandbox.HarborState, E = sandbox.Engine;
  const media = { id: 'm1', name: 'clip', type: 'video', url: 'blob:x', duration: 5 };
  const clip = E.addClip('v1', media, 0);
  assert(E.deleteClip(clip.id) === true);
  assert(S.state.tracks[0].clips.length === 0);
  assert(E.deleteClip(clip.id) === false, 'double delete should fail');
});

test('engine.js: moveClip clamps negative start', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const E = sandbox.Engine;
  const media = { id: 'm1', name: 'clip', type: 'video', url: 'blob:x', duration: 5 };
  const clip = E.addClip('v1', media, 1);
  E.moveClip(clip.id, -50);
  const found = E.findClip(clip.id);
  assert(found.clip.start === 0, 'start should clamp to 0');
});

test('engine.js: setFade caps at half duration', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const E = sandbox.Engine;
  const media = { id: 'm1', name: 'clip', type: 'video', url: 'blob:x', duration: 4 };
  const clip = E.addClip('v1', media, 0, { duration: 4 });
  E.setFade(clip.id, 'in', 999);
  const found = E.findClip(clip.id);
  assert(found.clip.fadeIn === 2, 'fadeIn should cap at duration/2, got ' + found.clip.fadeIn);
});

test('engine.js: exportProject strips blob URLs', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const S = sandbox.HarborState, E = sandbox.Engine;
  S.mutate((s) => { s.media.push({ id: 'm1', name: 'x', type: 'video', url: 'blob:secret', duration: 5 }); });
  const media = S.state.media[0];
  E.addClip('v1', media, 0);
  const out = E.exportProject();
  assert(out.media[0].url === undefined, 'export must not include blob URLs');
  assert(out.tracks[0].clips.length === 1);
});

test('engine.js: addTrack increments', () => {
  const { sandbox } = makeSandbox();
  loadScript('state.js', sandbox);
  loadScript('engine.js', sandbox);
  const S = sandbox.HarborState, E = sandbox.Engine;
  E.addTrack('video');
  assert(S.state.tracks.filter((t) => t.kind === 'video').length === 2);
});

console.log(`\n${passes.length} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✕ ${f.name}: ${f.error}`);
  process.exit(1);
} else {
  console.log('All HarborCut engine tests passed ✔');
}

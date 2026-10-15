# Starfall Academy — Animated Series & Edits

An original animated series rendered 100% in-browser: Canvas 2D animation engine, vector characters, procedural WebAudio score.

> Copyright note: every character, world, and music note is original (see `apps/starfall/LORE.md`) — safe to publish.

## Watch the episodes
```bash
cd apps/starfall
python3 -m http.server 8080
# open http://localhost:8080
```
- `index.html` — the series player: 2 episodes of ~5 minutes each
  - **Episode 1 — The Falling Hour**: Lumi's first solo star-catch goes wrong; the Silver Heron constellation falls over Solenna.
  - **Episode 2 — The Sky Remembers**: Lumi and Kaito climb the Starbridge; Lumi learns why the sky tears under her hands — and turns her flaw into the sky's greatest gift.
- `edits.html` — 3 dynamic AMV-style montages of the series (vertical 720×1280, TikTok format):
  - **Heroic**: soaring mood, downbeat cuts, push-in punches
  - **Emotional**: half-time, dissolves, breathing zoom
  - **Hype**: double-time whip-cuts, glitch flashes, kinetic text on every kick
  - One click **records the edit to a shareable .webm video** (MediaRecorder)

## Why programmatic animation?
- Zero copyright exposure: everything is drawn and synthesized at runtime
- 60 fps, ~5-minute episodes, with subtitles (silent-film style with rich procedural music)
- The same engine drives the series AND the edits — the edits are genuine showcases of the animation system

## Tech
| File | Role |
|---|---|
| `audio.js` | Procedural music engine: 5 moods (scales + patterns), 7 SFX synthesized live |
| `characters.js` | Vector characters: Lumi (comet-girl), Kaito (fox mechanic), Nix (star sprite), Master Orin |
| `stage.js` | Scenes: floating-city backdrop, academy room, Starbridge, night sky; starfields; subtitles |
| `episodes.js` | Episode screenplays: beat timelines (scenes, subtitles, sfx, moods, camera anims) |
| `index.html` | Player: beat scheduling, character blocking per scene, title cards |
| `edits.html` | Edit engine: beat-synced cuts, punch-zoom, shake, glitch, kinetic text, WebM export |

## Tests
```bash
node tests.js   # 7 tests: episode length, beat coverage, subtitle overlaps, valid sfx/moods
```

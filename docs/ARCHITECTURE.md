# Architecture — NovaLoom Suite

```
Dev-Apps/
├── brand.config.json        # Single source of truth for brand/names/colors
├── README.md                # Overview & run instructions
├── docs/                    # All documentation
└── apps/
    ├── harborcut/           # Desktop video editor (Electron)
    ├── verdantfarm/          # Mobile farm game (React Native + Expo)
    ├── aquapuzzle/           # Mobile match-3 + aquarium (React Native + Expo)
    └── starfall/             # Animated series + AMV edits (web, Canvas + WebAudio)
```

## Shared principles
- **No heavy frameworks where none is needed.** HarborCut and Starfall are vanilla JS; the games are React Native/Expo as required for mobile builds.
- **Engines are UI-agnostic.** Each game's logic lives in `src/game.js` — pure functions/classes with no React imports — so it is fully unit-testable and reusable.
- **Everything is tested.** Each app ships a test suite; CI should run them on every push (see PUBLISH.md).
- **Security by default.** Electron runs with contextIsolation, sandbox, no node integration, and a strict CSP. All user-provided strings are HTML-escaped before insertion.

## Test results (this branch)
| App | Tests | Result |
|---|---|---|
| Verdant Farm | 21 (Jest) | ✅ all pass |
| Aqua Puzzle | 10 (Jest) | ✅ all pass — includes a fix for an infinite-cascade engine bug found by the tests |
| HarborCut | 12 (node) | ✅ all pass — state, undo/redo, engine ops |
| Starfall | 7 (node) | ✅ all pass — episode timings, overlaps, coverage |

## Known environment limits (honest notes)
- Emulators cannot run in the build sandbox (no KVM). The games are tested at the logic level; run them on device/emulator with the instructions in each doc.
- HarborCut's Electron window cannot render headless here (no display server). Engine + syntax fully validated; packaging config ready.
- npm audit reports a critical `tar` advisory inside the Expo build toolchain (`xcode` package). It affects build tooling only, never ships in the app binaries. Fixing requires a breaking Expo downgrade — documented, accepted for now.

# HarborCut — Video Editor

A desktop-class video editor, packaged with Electron. Timeline-based, multi-track, with real-time canvas preview and WebM export.

## Run (development)
```bash
cd apps/harborcut
npm install
npm start          # opens the Electron desktop app
```

## Build installers (real desktop software)
```bash
npm run dist:win     # → release/*.exe (NSIS installer + portable)
npm run dist:mac     # → release/*.dmg
npm run dist:linux   # → release/*.AppImage + .deb
```
The output is a normal installable desktop application for the target OS.

## Features
- **Media pool**: import video / audio / image files (file picker or drag-and-drop anywhere)
- **Multi-track timeline**: add as many video and audio tracks as needed; drag clips horizontally and across tracks with magnetic snapping
- **Real-time preview**: canvas compositing of all active video clips, image clips and text overlays
- **Editing ops**: split clip at playhead (S), delete (Del), move, trim via inspector, per-clip volume / opacity / scale / speed / rotation / position
- **Fades**: fade-in / fade-out per clip (capped at half the clip duration)
- **Text overlays**: add kinetic-style title clips (T), with color picker
- **Undo / redo**: 100-deep history (Ctrl+Z / Ctrl+Shift+Z)
- **Zoomable timeline ruler** (10–400 px/s) with timecode display
- **Project save/open**: native `.hcproj` files via desktop dialogs (browser fallback: download)
- **Export**: renders the composed timeline to WebM (VP9/VP8, 8 Mbps, 30 fps) via MediaRecorder

## Shortcuts
| Key | Action |
|---|---|
| Space | Play / pause |
| S | Split selected clip at playhead |
| T | Add text clip at playhead |
| Del / Backspace | Delete selected clip |
| ← / → | Step 1 frame (Shift = 1 s) |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |

## Engine tests
```bash
npm test    # 12 tests: state, undo/redo bounds, split/move/delete/fade rules, export safety
```

## Security
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`
- Strict CSP on the editor page (`media-src blob:` only for local imports)
- IPC surface limited to 3 explicit handlers (save/open/autosave), path validated server-side
- All filenames escaped before DOM insertion; project files validated on load (shape + type checks)
- Export strips blob URLs — saved projects contain no filesystem/media paths

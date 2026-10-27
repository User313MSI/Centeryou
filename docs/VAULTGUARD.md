# VaultGuard — Antivirus & Threat Protection

A standalone desktop antivirus by NovaLoom, packaged with Electron. Real-time
protection, quick/full/custom scans, signature + behavior detection, quarantine,
scan history, health scoring and JSON reports.

## Run (development)
```bash
cd apps/vaultguard
npm install
npm start          # opens the VaultGuard desktop app
```

## Build installers (real desktop software)
```bash
npm run dist:win     # → release/*.exe (NSIS installer + portable)
npm run dist:mac     # → release/*.dmg
npm run dist:linux   # → release/*.AppImage + .deb
```

## Features
- **Dashboard**: live health score (ring), files scanned / threats / quarantined /
  real-time uptime, recent activity feed, one-click scan actions
- **Scan**: Quick (Downloads/Desktop/Documents, depth 4), Full (user-chosen
  folders, depth 12), Custom (folder chips); live progress bar with current file,
  stop button, skeleton loading, result flash, truncated-result notice
- **Detection engine**: 78+ signatures — hex (EICAR), text patterns (PowerShell
  download-exec, encoded commands, webshells, ransomware notes, credential
  dumping, process hollowing, miners, C2, exfil…), URL patterns (suspicious TLDs,
  raw-IP payloads, data-URIs), PE checks (MZ header + suspicious imports, SFX
  RAR/7z), dangerous-name and double-extension lures, entropy-based packer
  detection, and 10 **behavior rules** (content/extension mismatch, temp/startup
  drop zones, right-to-left override, homoglyphs, padded extensions…)
- **Confidence levels**: `certain` / `high` / `medium` / `low` per detection
- **Real-Time Protection**: folder watcher with new / modified / deleted /
  new-executable / modified-executable events, severity highlighting, time-budgeted
  ticks, event cap, add/remove watched folders
- **Quarantine**: isolate = copy to `userData/quarantine/*.vgq` (0600) + remove
  original; list, delete, clear; auto-quarantine of infected files (setting)
- **History**: capped (200) scan records with type/targets/counts/duration
- **Reports**: export full JSON report (paths redacted to `~`) via native dialog
- **Settings**: realtime toggle, auto-quarantine, archives, notifications,
  signature DB version + full signature stats, quarantine location

## Shortcuts
| Key | Action |
|---|---|
| Ctrl+1 … Ctrl+6 | Switch view (Dashboard / Scan / Real-Time / Quarantine / History / Settings) |
| Ctrl+Q | Quick scan |
| Ctrl+Shift+S | Full scan |

## Engine tests
```bash
npm test
# 162 tests: 46 engine + 12 Security + 27 security-audit + 15 performance-audit + 28 power-audit + UI/UX structural checks
```

## Security
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`
- Strict CSP (`default-src 'self'`, `connect-src 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`)
- Renderer never touches Node: all FS access goes through a whitelisted preload bridge (12 channels)
- IPC hardening: every handler validates types, clamps ints, rejects null bytes / traversal,
  confines quarantine to `userData/quarantine`, wraps handlers in try/catch, blocks non-file:// requests
- All renderer DOM built via `Dom.el()` (createElement + textContent) — **zero `innerHTML` with data**
- All user-controlled strings HTML-escaped or inserted as text nodes
- Inputs sanitized/clamped in a dedicated `Security` module (paths, names, options, entries)
- localStorage parsed defensively (`safeJsonParse`); corrupted state degrades to empty
- Signature tables frozen (immutable); regex `lastIndex` reset before every test
- Reports redact home-directory paths; export rate-limited (3/min); disk reads rate-limited (500/s)
- Quarantined files stored `0600`, original removed only after successful copy (rollback on failure)
- No secrets/tokens in repo; no network egress from the renderer (CSP + webRequest block)

## UI/UX & performance notes
- ARIA: nav `aria-current`, `role="status"`/`role="alert"`, `aria-live` regions, progressbar
  with `aria-valuenow`, skip-link, focus-visible outlines, `prefers-reduced-motion`, responsive
- Loading skeletons, button spinners, confirm dialogs for destructive actions, keyboard shortcuts hint
- Scan concurrency 1–64 (default 8), progress throttled (every 10 files or 100 ms),
  hex/text conversion cached, archives/empty/huge files skipped without disk reads,
  dedup of overlapping scan targets, history cache (2 s TTL), realtime tick time budget,
  event/result lists capped and virtualized by truncation notice

## False-positive control (context-aware scoring)
- Files that are **plain-text source code** (`.py`, `.ts`, `.js`, `.java`, `.json`, `.md`…) or live in **trusted directories** (`src/`, `tests/`, `docs/`, `node_modules/`…) get a **×0.25 weight reduction** on text signatures and a −30 context adjustment
- `.php`/`.asp`/`.aspx`/`.jsp` (web-executable) and `.ps1`/`.bat`/`.cmd`/`.vbs`/`.hta` keep **full weight** — a webshell in `.php` is still `infected`, a dropper `.ps1` in Temp is still `infected`
- Every reduction is **visible in the result reasons** (« reduced weight: source code context », « likely false positive »)
- Verified by 8 dedicated tests (`[fp-fix]` suite)

## Known environment limits (honest notes)
- The Electron window cannot render headless in this sandbox (no display server).
  Engine + syntax fully validated by 162 Node tests; packaging config ready.
- Real filesystem scanning requires the desktop app (the preload bridge); in a plain
  browser the UI runs but scanning is disabled with a toast.
- Signature DB is local and static (no cloud updates) — a deliberate scope choice for v1.

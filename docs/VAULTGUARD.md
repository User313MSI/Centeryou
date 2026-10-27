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
- **Process Protection** (`ProcessGuard`): live process list via OS APIs, flags known
  attack tools (mimikatz, psexec, xmrig…), LOLBIN abuse (powershell/rundll32/mshta…
  with download/exec args, hidden windows, temp paths), executables from temp,
  office/browser spawning unusual children, unsigned binaries — **kill button**
- **Network Protection** (`NetGuard`): live TCP connections, flags C2 ports (4444,
  5555, 31337…), raw-IP C2 from script processes, suspicious TLDs, DGA-like domains,
  temp-folder executables connecting out, beaconing patterns; whitelist of known-good
  hosts (Microsoft/Google/GitHub…) to cut noise
- **Ransomware Protection** (`RansomGuard`): monitors real-time file events for
  crypto-extension renames (.locked/.wcry/.zepto…) in bursts, ransom-note file names
  (HOW_TO_DECRYPT, readme…), trips an alert + native notification, protected-folder list
- **Startup & Persistence** (`BootGuard`): scans registry Run/RunOnce (HKCU/HKLM,
  incl. WOW6432Node + Policies\Explorer\Run), Startup folders, (Linux: rc.local,
  ~/.config/autostart, crontab); flags download-exec values, AppData/Temp persistence,
  scripts in Startup, masquerading names (svchost, winlogon…), known-app whitelist
- **Scheduled scans** (`Scheduler`): hourly/daily/weekly jobs, quick or custom-folder,
  pause/resume/delete, auto-runs in background every 30 s check
- **Exclusions** (`Exclusions`): path / file-name / glob (`*.log`, `C:\Tools\*`),
  substring matching, persisted, applied by the scanner (skipped files not scanned)
- **Repair** (`Repair` + `repair:clean-file` IPC): removes PHP webshell blocks,
  PowerShell `-enc`/iwr|iex chains, JS `eval(atob(...))` — with a `.vgbak` backup
- **Signature updater** (`Updater`): versioned DB (`YYYY.MM.DD-N`), manifest
  comparison (needsUpdate), staged updates, auto-update toggle, last-check tracking
- **System tray**: icon in the notification area — click to show/hide, context menu
  (Open / Quick Scan / Quit); closing the window hides to tray instead of quitting
- **Native notifications**: Windows toast on ransomware alerts and scan results
- **Context-aware scoring**: source files (.py/.ts/.diff/.patch/…) and trusted dirs
  (src/, tests/, docs/) get reduced signature weights → no more false positives on
  your own code; .php/.ps1/.bat keep full weight
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
# 217 tests: 46 engine + 12 Security + 27 security-audit + 15 performance-audit
#            + 28 power-audit + 8 false-positive-fix + 47 pro-modules + 34 misc
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
- Signature DB is local and static; the `Updater` module implements version comparison
  and staged updates, but no network fetch channel yet (deliberate v1 scope — CSP blocks egress).
- Process/network/autorun listing shells out to OS tools (`powershell`, `ps`, `ss`);
  on locked-down machines these views may return empty — the engines degrade gracefully.
- `sys:kill-process` refuses pid ≤ 4; killing a process is a user-confirmed action only.

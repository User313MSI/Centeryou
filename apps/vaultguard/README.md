# VaultGuard — Antivirus & Threat Protection

Standalone desktop antivirus (Electron) by NovaLoom. Real-time protection, quick/full/custom scans,
process & network protection, startup (persistence) guard, ransomware shield, scheduler, quarantine,
scan history, health score and JSON reports.

## Run

```bash
npm install
npm start          # dev
npm test           # engine + audit test suites (no dependencies)
npm run dist:win   # NSIS installer + portable (Windows)
npm run dist:mac   # DMG (macOS)
npm run dist:linux # AppImage + deb (Linux)
```

The renderer also works as a static web page (open `index.html`); desktop-only features
(process/network/boot/quarantine) require the Electron app.

## Commercial features (v1.1)

- **14-day free trial** — every new installation gets all features for 14 days, tracked locally.
- **License activation** — signed license keys (`VG-XXXX-…`) bound to the machine, with plans
  Pro (1 seat), Team (10 seats) and Business (50 seats). When the trial ends or a license is invalid,
  scans are gated and the app directs the user to the License view.
- **License view** — status, plan, customer, expiry, machine ID, activation/deactivation.
- **Signed update channel** — update manifests are verified with HMAC-SHA256 before being accepted;
  tampered or unsigned manifests are rejected. Update checks run over HTTPS only and refuse
  private/loopback hosts. SHA-256/HMAC are implemented in pure JS (`js/security.js`) and verified
  against RFC vectors in the test suite.
- **Start with Windows** — enabled by default on first packaged run; toggle in Settings.
- **Tray** — quick scan, open the License view, quit; the tray tooltip and window title show the
  current license state.

### License key format

`VG` + plan (`PRO` | `TEAM` | `BUSINESS`) + expiry (`YYYYMMDD`) + 16-hex-char HMAC signature over
`v1|VG|<plan>|<expiry>|<machineId>`, grouped in 4-character blocks, e.g.
`VGPR-O209-9123-16E0-2F9B-07CE-2D75-4`.

Generate keys with `License.makeKey({ plan, expires, machineId })` (`js/license.js`).
In production, replace `License.SECRET` with a server-side secret and issue keys from your store.

### Update manifest format

```json
{
  "version": "2025.11.02-1",
  "signatures": 81234,
  "sha256": "<sha256 of the payload>",
  "channel": "stable",
  "minAppVersion": "1.1.0",
  "sig": "<hmac-sha256 hex of 'VG-UPDATE|<version>|<signatures>|<sha256>|<channel>|<minAppVersion>'>"
}
```

Serve it at the URL configured in `package.json` (`config.updateUrl`) and in Settings → Updates.

## Security notes

- Renderer runs with `contextIsolation`, `sandbox`, no Node integration; CSP forbids remote content.
- All IPC inputs are validated/clamped in `main.js`; quarantine writes are confined to the
  quarantine directory; paths with traversal are rejected.
- Quarantined files are stored as `.vgq` with `0600` permissions.

## Tests

`npm test` runs five suites: engine, security audit (73), power audit (28), false-positive fixes,
pro-modules + commercial (license, signed updates, SHA-256/HMAC) and performance audit.

# Publication Checklist

## Brand rename (when ready)
1. Edit `brand.config.json` (brand name, palette).
2. Rename product names in: `apps/harborcut/package.json` (`productName`, `build.productName`), `apps/*/app.json` (Expo `name`/`slug`), `apps/starfall/index.html` (title + footer).
3. Bundle IDs are already namespaced `com.novaloom.*` — find/replace `novaloom` if you change the brand.

## HarborCut (desktop software)
- [ ] `npm run dist:win` / `dist:mac` / `dist:linux` from `apps/harborcut` → installers in `release/`
- [ ] Code-sign Windows (cert) and macOS (Developer ID) for distribution outside app stores
- [ ] Optional: Microsoft Store / notarization for macOS Gatekeeper

## Games (mobile stores)
- [ ] Create icon + splash PNGs in `apps/*/assets/` (referenced by `app.json`, currently placeholders absent — generate before EAS build)
- [ ] `npx eas build --platform android` → `.aab` for Google Play
- [ ] `npx eas build --platform ios` → `.ipa` for App Store (Apple Developer account needed)
- [ ] Store listings: screenshots (Expo Go capture), descriptions from the game docs

## VaultGuard (desktop antivirus)
- [ ] `npm run dist:win` / `dist:mac` / `dist:linux` from `apps/vaultguard` → installers in `release/`
- [ ] Code-sign Windows (cert) and macOS (Developer ID) for distribution outside app stores
- [ ] Optional: register as a Windows Security Center provider (WSC API) for OS integration
- [ ] Optional: add a real signature-update channel (signed DB over HTTPS) — v1 ships a local static DB

## Starfall (series + edits)
- [ ] Open `apps/starfall/edits.html`, record each of the 3 edits → `.webm`
- [ ] Convert to MP4 (e.g. `ffmpeg -i in.webm out.mp4`) for TikTok/Instagram upload
- [ ] All content is original — no third-party clearance needed

## CI recommendation
Run on every push: `cd apps/verdantfarm && npm test`, `cd apps/aquapuzzle && npm test`, `cd apps/harborcut && npm test`, `cd apps/vaultguard && npm test`, `node apps/starfall/tests.js`.

## Security (verified this branch)
- Electron hardening: contextIsolation ✓ sandbox ✓ no node integration ✓ CSP ✓
- IPC handlers validate paths; project files shape-checked on load
- No secrets/tokens in repo; `innerHTML` usage is escaped or static
- VaultGuard: Electron hardening ✓ contextIsolation ✓ sandbox ✓ no node integration ✓ strict CSP ✓ webRequest egress blocked ✓ IPC whitelist (12 channels) with type/clamp/traversal validation ✓ zero `innerHTML` with data ✓ quarantine confined to `userData/quarantine` ✓ reports redact home paths ✓ rate-limited disk reads & exports ✓
- Known accepted: critical `tar` advisory in Expo build toolchain (`xcode`) — build-time only, does not ship in app binaries; fix requires breaking Expo downgrade

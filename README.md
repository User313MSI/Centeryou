# NovaLoom Studio Suite

A professional software suite built for publication. Three products, one repository.

**Temporary brand: NovaLoom** — change it in one place: `brand.config.json`.

## Products

| App | Path | Type | Description |
|---|---|---|---|
| **HarborCut** | `apps/harborcut/` | Web app (desktop-class) | Video editing software — multi-track timeline, trimming, splitting, fades, text overlays, audio mixing, export to video file |
| **Verdant Farm** | `apps/verdantfarm/` | Mobile game (PWA) | Farm management game — plant, grow, harvest, sell, expand your farm |
| **Aqua Puzzle** | `apps/aquapuzzle/` | Mobile game (PWA) | Match-3 puzzle with an aquarium you fill by buying new fish |
| **Centeryou** | `apps/centeryou/` | Web app (Next.js PWA) | Personal interactive planner in French — agenda + tasks + voice assistant, local-first |

## Run any app

No build step, no dependencies. Open and go:

```bash
# any static server, e.g.:
cd apps/harborcut && python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

Installable: the games are Progressive Web Apps (add to home screen on Android/iOS).

**Centeryou** (in `apps/centeryou/`) is a Next.js app, so it needs one install step:

```bash
cd apps/centeryou && npm install && npm run dev   # then open http://localhost:3000
```

## Documentation

- [Suite overview & architecture](docs/ARCHITECTURE.md)
- [HarborCut — video editor](docs/HARBORCUT.md)
- [Verdant Farm — farm game](docs/VERDFARM.md)
- [Aqua Puzzle — aquarium puzzle](docs/AQUAPUZZLE.md)
- [Publication checklist](docs/PUBLISH.md)

## Branding

All names, colors and credits live in `brand.config.json` at the repo root.
A follow-up rename is a one-file change.

© 2025 NovaLoom. All rights reserved.

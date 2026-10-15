# Verdant Farm — Farm Game (React Native + Expo)

A cozy farm-management game with lore, characters, animals, quests and an almanac collection. See `apps/verdantfarm/LORE.md` for the world bible.

## Run on your phone (2 minutes)
```bash
cd apps/verdantfarm
npm install
npx expo start
```
- Scan the QR code with **Expo Go** (Android/iOS) — the game runs immediately on your device.
- Or press `a` / `i` to launch in your own Android/iOS emulator (Android Studio / Xcode required on your machine).

## Build store-ready binaries (EAS)
```bash
npx eas build --platform android    # → .apk / .aab
npx eas build --platform ios        # → .ipa (requires Apple account)
```

## Gameplay systems
- **Crops (7)**: wheat → carrot → tomato → corn → pumpkin → strawberry → Moonpetal (rare, night-only half-speed during day)
- **Animals (6)**: hen, cow, sheep, goat, bees (honey + 15% growth boost to all crops), alpaca — each with a production cycle and escalating purchase cost
- **Plots**: buy more land; upgrade soil tier 1→2 (Rich)→3 (Golden) — each tier multiplies growth speed
- **Economy**: barn capacity (upgradeable), product storage, market upgrade (+15% prices/level)
- **Weather**: sunny / cloudy / rain (+25% growth) / rare Valley Blessing (×2 yield, 30 s) — rolled every 2–5 min
- **Day/night cycle** (4-min in-game days): night visuals, Moonpetal mechanics
- **Quests (6)**: story quests via Rook the scarecrow with lore rewards, claimable on the Quest board
- **Almanac**: Granny Alba's collection of every crop/product discovered, with lore lines
- **XP/levels**: unlock crops, animals and systems; progression saved to AsyncStorage (`verdantfarm_save_v2`), offline growth supported (crops grow while away)

## Tests
```bash
npm test    # 21 Jest tests: crops, animals, plots, quests, weather, day/night, economy
```

## Notes
- Game logic is fully decoupled from UI (`src/game.js`) — reusable for a future server or web port.
- Save versioned (`_v2`); migration-friendly.

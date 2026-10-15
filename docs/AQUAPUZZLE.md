# Aqua Puzzle — Aquarium Match-3 (React Native + Expo)

Match-3 puzzle game where matches earn coins to buy fish for your aquarium. 10 fish to collect, from Guppy to Whale.

## Run on your phone (2 minutes)
```bash
cd apps/aquapuzzle
npm install
npx expo start
```
Scan the QR with **Expo Go**, or press `a`/`i` for your own emulators. Store builds: `npx eas build --platform android|ios`.

## Gameplay
- **8×8 board**, 6 gem types, tap-tap swapping (adjacent only)
- **Cascades**: chain reactions multiply rewards (+25 coins per extra cascade)
- **Anti-frustration**: board auto-reshuffles when no moves remain; shuffle button available
- **Rounds**: 30 moves per round; round summary with earnings, then a fresh board — endless play
- **Aquarium**: owned fish appear swimming in the tank above the board
- **Fish shop**: 10 fish (Guppy free → Whale at 50,000 coins), progress saved to AsyncStorage
- **Floating coin feedback** on every match

## Engine
`src/game.js` is pure logic: `newBoard`, `findMatches`, `trySwap`, `resolveBoard` (gravity + refill + cascade guard), `hasPossibleMove`, `shuffleBoard`, `coinsEarned`.

> The test suite caught a real production bug: with a degenerate refill RNG, identical columns could cascade forever and freeze the game. Fixed with a cascade guard (max 100).

## Tests
```bash
npm test    # 10 Jest tests: matching, swap validation, cascades, shuffles, scoring
```

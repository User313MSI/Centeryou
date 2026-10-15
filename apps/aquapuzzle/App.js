import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FISH, GEM_TYPES, ROWS, COLS, newBoard, findMatches, trySwap, resolveBoard, hasPossibleMove, shuffleBoard, coinsEarned } from './src/game';

const SAVE_KEY = 'aquapuzzle_save_v1';
const { width } = Dimensions.get('window');
const CELL = Math.floor((width - 32) / COLS);

export default function App() {
  const [coins, setCoins] = React.useState(100);
  const [ownedFish, setOwnedFish] = React.useState(['guppy']);
  const [board, setBoard] = React.useState(() => newBoard());
  const [selected, setSelected] = React.useState(null);
  const [moves, setMoves] = React.useState(30);
  const [score, setScore] = React.useState(0);
  const [shopOpen, setShopOpen] = React.useState(false);
  const [floating, setFloating] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (typeof s.coins === 'number') setCoins(s.coins);
          if (Array.isArray(s.ownedFish)) setOwnedFish(s.ownedFish);
        }
      } catch (e) {}
    })();
  }, []);

  const save = React.useCallback(async (c, f) => {
    try {
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ coins: c, ownedFish: f }));
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    save(coins, ownedFish);
  }, [coins, ownedFish]);

  const float = (text, key) => {
    setFloating((f) => [...f, { text, key }]);
    setTimeout(() => setFloating((f) => f.filter((x) => x.key !== key)), 1000);
  };

  const finishMove = (newBoard, cleared, cascades) => {
    let b = newBoard;
    let allCleared = cleared;
    let allCascades = cascades;
    if (!hasPossibleMove(b)) {
      b = shuffleBoard(b);
      float('Reshuffled!', Date.now());
    }
    setBoard(b);
    const earned = coinsEarned(allCleared, allCascades);
    setCoins((c) => c + earned);
    setScore((s) => s + earned);
    setMoves((m) => {
      const nm = m - 1;
      if (nm <= 0) {
        setTimeout(() => {
          Alert.alert('Round over!', `You earned $${earned} this round. Board refreshed — keep playing!`, [
            { text: 'Continue', onPress: () => { setBoard(newBoard()); setMoves(30); } },
          ]);
        }, 400);
      }
      return nm;
    });
    float(`+$${earned}`, Date.now() + Math.random());
  };

  const onPressCell = (r, c) => {
    if (moves <= 0) return;
    if (selected === null) {
      setSelected({ r, c });
      return;
    }
    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }
    const res = trySwap(board, selected.r, selected.c, r, c);
    setSelected(null);
    if (!res.ok) {
      if (res.error === 'Not adjacent' || res.error === 'Out of bounds') setSelected({ r, c });
      return;
    }
    const resolution = resolveBoard(res.board);
    finishMove(resolution.board, resolution.totalCleared, resolution.cascades);
  };

  const buyFish = (id) => {
    const fish = FISH[id];
    if (ownedFish.includes(id)) return;
    if (coins < fish.price) {
      Alert.alert('Aqua Puzzle', 'Not enough coins! Play puzzles to earn more.');
      return;
    }
    setCoins((c) => c - fish.price);
    setOwnedFish((f) => [...f, id]);
    setShopOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>🐡 Aqua Puzzle</Text>
          <View style={styles.stats}>
            <Text style={styles.stat}>🪙 {coins}</Text>
            <Text style={styles.stat}>Moves: {moves}</Text>
          </View>
        </View>

        <View style={styles.aquarium} accessibilityLabel="Your aquarium">
          {ownedFish.map((id, i) => (
            <View
              key={id}
              style={[styles.fish, { bottom: 20 + ((i * 37) % 60), left: 12 + ((i * 53) % (width - 90)) }]}
            >
              <Text style={styles.fishEmoji}>{FISH[id].emoji}</Text>
            </View>
          ))}
          {floating.map((f) => (
            <Text key={f.key} style={styles.float}>{f.text}</Text>
          ))}
        </View>

        <View style={styles.boardWrap}>
          {board.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((gem, c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    selected && selected.r === r && selected.c === c && styles.cellSelected,
                  ]}
                  onPress={() => onPressCell(r, c)}
                  accessibilityLabel={`Gem ${r}-${c}`}
                >
                  <Text style={styles.gem}>{GEM_TYPES[gem]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.shopButton} onPress={() => setShopOpen(true)}>
            <Text style={styles.shopButtonText}>🛒 Fish Shop ({ownedFish.length}/{Object.keys(FISH).length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shuffleButton}
            onPress={() => { setBoard(shuffleBoard(board)); float('Reshuffled!', Date.now()); }}
          >
            <Text style={styles.shuffleButtonText}>🔀 Shuffle</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={shopOpen} transparent animationType="slide" onRequestClose={() => setShopOpen(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>🐟 Fish Shop</Text>
              <Text style={styles.sheetSub}>Your coins: 🪙 {coins}</Text>
              <ScrollView>
                {Object.entries(FISH).map(([id, fish]) => {
                  const owned = ownedFish.includes(id);
                  const affordable = coins >= fish.price;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.shopItem, owned && styles.shopItemOwned]}
                      onPress={() => buyFish(id)}
                      disabled={owned}
                    >
                      <Text style={styles.shopItemEmoji}>{fish.emoji}</Text>
                      <View style={styles.shopItemInfo}>
                        <Text style={styles.shopItemName}>{fish.name}</Text>
                        <Text style={styles.shopItemPrice}>{owned ? 'Owned' : `🪙 ${fish.price}`}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 30 }} />
              </ScrollView>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShopOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#06182e' },
  screen: { flex: 1, backgroundColor: '#0a2540' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brand: { color: '#fff', fontSize: 18, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { color: '#bfe3ff', fontWeight: '700', fontSize: 13 },
  aquarium: {
    height: 130,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'linear-gradient(180deg, #103a63, #062038)',
    backgroundColor: '#0d3157',
    borderWidth: 2,
    borderColor: '#1d4d7d',
    overflow: 'hidden',
    position: 'relative',
  },
  fish: { position: 'absolute' },
  fishEmoji: { fontSize: 26 },
  float: {
    position: 'absolute',
    right: 14,
    top: 10,
    color: '#7cffb2',
    fontWeight: '900',
    fontSize: 16,
  },
  boardWrap: { marginTop: 14, alignItems: 'center' },
  row: { flexDirection: 'row' },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cellSelected: {
    backgroundColor: 'rgba(126, 200, 255, 0.35)',
    borderWidth: 2,
    borderColor: '#7ec8ff',
  },
  gem: { fontSize: CELL * 0.55 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  shopButton: {
    flex: 1,
    backgroundColor: '#2f8fde',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shopButtonText: { color: '#fff', fontWeight: '800' },
  shuffleButton: {
    backgroundColor: '#1d4d7d',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  shuffleButtonText: { color: '#bfe3ff', fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,10,20,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0d2540',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 18,
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sheetSub: { color: '#bfe3ff', marginBottom: 10, marginTop: 2 },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  shopItemOwned: { opacity: 0.5 },
  shopItemEmoji: { fontSize: 28, marginRight: 14 },
  shopItemInfo: { flex: 1 },
  shopItemName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  shopItemPrice: { color: '#ffd166', marginTop: 2, fontWeight: '700' },
  closeBtn: {
    backgroundColor: '#2f8fde',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  closeText: { color: '#fff', fontWeight: '800' },
});

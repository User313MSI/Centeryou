import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FISH, newBoard, findMatches, trySwap, resolveBoard, hasPossibleMove, shuffleBoard, coinsEarned } from './src/game';
import Board3D from './src/components/Board3D';

const SAVE_KEY = 'aquapuzzle_save_v1';

export default function App() {
  const [coins, setCoins] = React.useState(100);
  const [ownedFish, setOwnedFish] = React.useState(['guppy']);
  const [board, setBoard] = React.useState(() => newBoard());
  const [selected, setSelected] = React.useState(null);
  const [moves, setMoves] = React.useState(30);
  const [score, setScore] = React.useState(0);
  const [shopOpen, setShopOpen] = React.useState(false);
  const [flash, setFlash] = React.useState(null);

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
    try { await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ coins: c, ownedFish: f })); } catch (e) {}
  }, []);
  React.useEffect(() => { save(coins, ownedFish); }, [coins, ownedFish]);

  const float = (text) => {
    setFlash({ text, key: Date.now() + Math.random() });
    setTimeout(() => setFlash(null), 1100);
  };

  const onCellTap = (r, c) => {
    if (moves <= 0) return;
    if (selected === null) { setSelected({ r, c }); return; }
    if (selected.r === r && selected.c === c) { setSelected(null); return; }
    const res = trySwap(board, selected.r, selected.c, r, c);
    if (!res.ok) {
      setSelected({ r, c });
      return;
    }
    setSelected(null);
    const resolution = resolveBoard(res.board);
    let b = resolution.board;
    if (!hasPossibleMove(b)) {
      b = shuffleBoard(b);
      float('Reshuffled!');
    }
    const earned = coinsEarned(resolution.totalCleared, resolution.cascades);
    setBoard(b);
    setCoins((cv) => cv + earned);
    setScore((sv) => sv + earned);
    setMoves((m) => {
      const nm = m - 1;
      if (nm <= 0) {
        setTimeout(() => {
          Alert.alert('Round over!', `You earned $${earned} this round. New board — keep playing!`, [
            { text: 'Continue', onPress: () => { setBoard(newBoard()); setMoves(30); } },
          ]);
        }, 400);
      }
      return nm;
    });
    if (earned > 0) float(`+$${earned}${resolution.cascades > 1 ? ` (x${resolution.cascades} cascade!)` : ''}`);
  };

  const buyFish = (id) => {
    const fish = FISH[id];
    if (ownedFish.includes(id)) return;
    if (coins < fish.price) {
      Alert.alert('Aqua Puzzle', 'Not enough coins! Match gems to earn more.');
      return;
    }
    setCoins((c) => c - fish.price);
    setOwnedFish((f) => [...f, id]);
    setShopOpen(false);
    float(`${fish.emoji} ${fish.name} added to your aquarium!`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <Board3D
          board={board}
          selected={selected}
          ownedFish={ownedFish}
          coinsFlash={flash}
          onCellTap={onCellTap}
        />

        <View style={styles.hudTop}>
          <Text style={styles.brand}>🐡 Aqua Puzzle</Text>
          <View style={styles.stats}>
            <Text style={styles.stat}>🪙 {coins}</Text>
            <Text style={styles.stat}>Moves: {Math.max(0, moves)}</Text>
          </View>
        </View>

        {flash ? (
          <View style={styles.flash} pointerEvents="none">
            <Text style={styles.flashText}>{flash.text}</Text>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.shopButton} onPress={() => setShopOpen(true)}>
            <Text style={styles.shopButtonText}>🛒 Fish Shop ({ownedFish.length}/{Object.keys(FISH).length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shuffleButton}
            onPress={() => { setBoard(shuffleBoard(board)); float('Reshuffled!'); }}
          >
            <Text style={styles.shuffleButtonText}>🔀</Text>
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
  safe: { flex: 1, backgroundColor: '#04101e' },
  screen: { flex: 1 },
  hudTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
    backgroundColor: 'rgba(2, 10, 22, 0.5)',
  },
  brand: { color: '#fff', fontSize: 18, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { color: '#bfe3ff', fontWeight: '800', fontSize: 13 },
  flash: {
    position: 'absolute', top: '40%', alignSelf: 'center',
    backgroundColor: 'rgba(6, 24, 44, 0.85)',
    borderRadius: 18, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: '#4fa8ff',
  },
  flashText: { color: '#7cffb2', fontWeight: '900', fontSize: 16 },
  bottomBar: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    flexDirection: 'row', gap: 10,
  },
  shopButton: {
    flex: 1, backgroundColor: '#2f8fde', borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  shopButtonText: { color: '#fff', fontWeight: '900' },
  shuffleButton: {
    backgroundColor: 'rgba(14, 40, 64, 0.9)', borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 18,
  },
  shuffleButtonText: { fontSize: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,8,18,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0d2540', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '80%', padding: 18, paddingBottom: 30,
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sheetSub: { color: '#bfe3ff', marginBottom: 10, marginTop: 2 },
  shopItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 12, marginBottom: 8,
  },
  shopItemOwned: { opacity: 0.5 },
  shopItemEmoji: { fontSize: 28, marginRight: 14 },
  shopItemInfo: { flex: 1 },
  shopItemName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  shopItemPrice: { color: '#ffd166', marginTop: 2, fontWeight: '700' },
  closeBtn: { backgroundColor: '#2f8fde', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  closeText: { color: '#fff', fontWeight: '900' },
});

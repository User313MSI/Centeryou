import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, ScrollView, TouchableOpacity, Modal, Alert, StyleSheet, Dimensions, Image } from 'react-native';
import { GameManager, CROPS, ANIMALS, UPGRADES, WEATHERS } from './src/game';
import FarmScene3D from './src/components/FarmScene3D';
import QuestBoard from './src/components/QuestBoard';
import ShopModal from './src/components/ShopModal';
import AlmanacModal from './src/components/AlmanacModal';
import Toast from './src/components/Toast';

const { width } = Dimensions.get('window');

export default function App() {
  const manager = React.useRef(null);
  if (!manager.current) manager.current = new GameManager();
  const gm = manager.current;

  const [state, setState] = React.useState(gm.getState());
  const [panel, setPanel] = React.useState(null); // null | 'barn' | 'quests' | 'shop' | 'almanac'
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    gm.load();
    const id = setInterval(() => setState({ ...gm.tick() }), 500);
    return () => clearInterval(id);
  }, [gm]);

  const notify = (msg) => setToast({ msg, key: Date.now() + Math.random() });

  const handle = (fn, okMsg) => {
    const res = fn();
    setState({ ...gm.getState() });
    if (!res.ok) Alert.alert('Verdant Farm', res.error);
    else if (okMsg) notify(typeof okMsg === 'function' ? okMsg(res) : okMsg);
    return res;
  };

  const onPlotTap = (index) => {
    const plot = gm.state.plots[index];
    if (!plot) return;
    if (plot.ready) {
      handle(() => gm.harvest(index), (r) => `+${r.amount} ${r.cropName}`);
      return;
    }
    if (!plot.crop) {
      const available = Object.entries(CROPS).filter(([, c]) => gm.state.level >= c.unlockLevel);
      Alert.alert('🌱 Plant a crop', 'Choose a seed for this plot:', [
        ...available.map(([id, c]) => ({
          text: `${c.emoji} ${c.name} — $${c.seedCost}`,
          onPress: () => handle(() => gm.plant(index, id), `${CROPS[id].name} planted!`),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Growing…', `${CROPS[plot.crop].name}: ${Math.floor((plot.growProgress || 0) * 100)}%`, [
      plot.tier < 3
        ? { text: `⬆️ Upgrade soil ($${gm.plotUpgradeCost(plot.tier)})`, onPress: () => handle(() => gm.upgradePlot(index), 'Soil upgraded!') }
        : null,
      { text: 'Close', style: 'cancel' },
    ].filter(Boolean));
  };

  const harvestAll = () => {
    let count = 0;
    gm.state.plots.forEach((p, i) => { if (p.ready) { const r = gm.harvest(i); if (r.ok) count++; } });
    setState({ ...gm.getState() });
    notify(count ? `Harvested ${count} plot(s)!` : 'Nothing ready yet');
  };

  const claimQuest = (id) => {
    const res = gm.claimQuest(id);
    setState({ ...gm.getState() });
    if (res.ok) Alert.alert('Quest complete!', res.lore);
  };

  const weather = WEATHERS[state.weather] || WEATHERS.sunny;
  const night = gm.isNight();
  const readyCount = state.plots.filter((p) => p.ready).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <FarmScene3D
          style={{ flex: 1 }}
          plots={state.plots}
          animals={state.animals}
          time={state.time}
          weather={state.weather}
          onPlotTap={onPlotTap}
        />

        {/* Top HUD */}
        <View style={[styles.hudTop, night && styles.hudNight]}>
          <View style={styles.hudLeft}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv {state.level}</Text>
            </View>
            <View style={styles.barWrap}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (state.xp / gm.xpNeeded) * 100)}%` }]} />
              </View>
            </View>
            <Text style={styles.weatherIcon}>{night ? '🌙' : weather.emoji}</Text>
          </View>
          <View style={styles.hudRight}>
            <TouchableOpacity onPress={() => setPanel('almanac')} style={styles.iconBtn}>
              <Text style={styles.iconText}>📖</Text>
            </TouchableOpacity>
            <View style={styles.coinBadge}>
              <Text style={styles.coinText}>🪙 {state.coins}</Text>
            </View>
            <TouchableOpacity onPress={() => setPanel('shop')} style={styles.shopBtn}>
              <Text style={styles.shopBtnText}>🛒</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom action bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setPanel('barn')}>
            <Text style={styles.actionEmoji}>🏚️</Text>
            <Text style={styles.actionLabel}>Barn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, readyCount > 0 && styles.actionBtnHot]}
            onPress={harvestAll}
          >
            <Text style={styles.actionEmoji}>🧺</Text>
            <Text style={styles.actionLabel}>Harvest{readyCount ? ` (${readyCount})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setPanel('quests')}>
            <Text style={styles.actionEmoji}>📜</Text>
            <Text style={styles.actionLabel}>Quests</Text>
          </TouchableOpacity>
        </View>

        {/* Panels */}
        <Modal visible={panel === 'barn'} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>🏚️ Barn & Products</Text>
              <ScrollView>
                <Text style={styles.sectionLabel}>Crops — tap to sell</Text>
                <View style={styles.gridRow}>
                  {Object.entries(state.barn).map(([cropId, qty]) =>
                    qty > 0 ? (
                      <TouchableOpacity key={cropId} style={styles.barnItem} onPress={() => handle(() => gm.sell(cropId), (r) => `+$${r.earned}`)}>
                        <Text style={styles.barnEmoji}>{CROPS[cropId].emoji}</Text>
                        <Text style={styles.barnQty}>{qty}</Text>
                        <Text style={styles.barnPrice}>${CROPS[cropId].sellPrice}/ea</Text>
                      </TouchableOpacity>
                    ) : null
                  )}
                </View>
                <Text style={styles.sectionLabel}>Animal Products</Text>
                <View style={styles.gridRow}>
                  {state.animals.map((a, i) => {
                    if (!a.ready) return null;
                    const def = ANIMALS[a.id];
                    return (
                      <TouchableOpacity key={i} style={styles.barnItem} onPress={() => handle(() => gm.collectAnimal(i), (r) => `${r.emoji} ${r.product}!`)}>
                        <Text style={styles.barnEmoji}>{def.productEmoji}</Text>
                        <Text style={styles.barnQty}>Collect</Text>
                        <Text style={styles.barnPrice}>{def.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {state.animals.every((a) => !a.ready) ? (
                    <Text style={styles.barnEmpty}>Animals are still producing…</Text>
              ) : null}
                </View>
                <Text style={styles.sectionLabel}>Products — tap to sell</Text>
                <View style={styles.gridRow}>
                  {Object.entries(state.products).map(([animalId, qty]) =>
                    qty > 0 ? (
                      <TouchableOpacity key={animalId} style={styles.barnItem} onPress={() => handle(() => gm.sellProduct(animalId), (r) => `+$${r.earned}`)}>
                        <Text style={styles.barnEmoji}>{ANIMALS[animalId].productEmoji}</Text>
                        <Text style={styles.barnQty}>{qty}</Text>
                        <Text style={styles.barnPrice}>${Math.floor(ANIMALS[animalId].buyCost / 4)}/ea</Text>
                      </TouchableOpacity>
                    ) : null
                  )}
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPanel(null)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ShopModal
          visible={panel === 'shop'}
          state={state}
          gm={gm}
          onClose={() => setPanel(null)}
          onBuy={(kind, id) => handle(() => gm.buy(kind, id), kind === 'plot' ? 'New plot unlocked!' : 'Upgraded!')}
          onBuyAnimal={(id) => handle(() => gm.buyAnimal(id), `${ANIMALS[id].name} joins the farm!`)}
        />

        <Modal visible={panel === 'quests'} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { maxHeight: '70%' }]}>
              <ScrollView>
                <QuestBoard quests={gm.questList()} onClaim={claimQuest} />
              </ScrollView>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPanel(null)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <AlmanacModal
          visible={panel === 'almanac'}
          almanac={state.almanac}
          onClose={() => setPanel(null)}
        />
        <Toast toast={toast} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f14' },
  screen: { flex: 1 },
  hudTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
    backgroundColor: 'rgba(8, 14, 10, 0.45)',
  },
  hudNight: { backgroundColor: 'rgba(4, 8, 20, 0.55)' },
  hudLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: { backgroundColor: '#ffd166', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { color: '#3a2c00', fontWeight: '900', fontSize: 13 },
  barWrap: { width: 90 },
  barTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#7cc46a', borderRadius: 4 },
  weatherIcon: { fontSize: 20 },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },
  iconText: { fontSize: 22 },
  coinBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  coinText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  shopBtn: { backgroundColor: '#ffd166', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  shopBtnText: { fontSize: 18 },
  bottomBar: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    flexDirection: 'row', gap: 10,
  },
  actionBtn: {
    flex: 1, backgroundColor: 'rgba(10, 16, 12, 0.72)', borderRadius: 16,
    alignItems: 'center', paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  actionBtnHot: { borderColor: '#ffd166', backgroundColor: 'rgba(60, 48, 8, 0.78)' },
  actionEmoji: { fontSize: 24 },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#17251a', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '80%', padding: 18, paddingBottom: 30,
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  sectionLabel: { color: '#9fd08a', fontWeight: '800', marginTop: 12, marginBottom: 6, fontSize: 13 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  barnItem: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 10, alignItems: 'center', minWidth: 86,
  },
  barnEmoji: { fontSize: 26 },
  barnQty: { color: '#fff', fontWeight: '800', fontSize: 15 },
  barnPrice: { color: '#c9e6bd', fontSize: 11 },
  barnEmpty: { color: '#c9e6bd', fontStyle: 'italic' },
  closeBtn: { backgroundColor: '#ffd166', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  closeText: { color: '#3a2c00', fontWeight: '900' },
});

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, ScrollView, TouchableOpacity, Modal, Alert, StyleSheet, Dimensions } from 'react-native';
import { GameManager, CROPS, ANIMALS, UPGRADES, WEATHERS } from './src/game';
import TopBar from './src/components/TopBar';
import PlotGrid from './src/components/PlotGrid';
import AnimalPen from './src/components/AnimalPen';
import QuestBoard from './src/components/QuestBoard';
import ShopModal from './src/components/ShopModal';
import AlmanacModal from './src/components/AlmanacModal';
import Toast from './src/components/Toast';

const { width } = Dimensions.get('window');

const TABS = [
  { id: 'farm', label: '🌱 Farm' },
  { id: 'animals', label: '🐮 Animals' },
  { id: 'quests', label: '📜 Quests' },
];

export default function App() {
  const manager = React.useRef(null);
  if (!manager.current) manager.current = new GameManager();
  const gm = manager.current;

  const [state, setState] = React.useState(gm.getState());
  const [tab, setTab] = React.useState('farm');
  const [shopOpen, setShopOpen] = React.useState(false);
  const [almanacOpen, setAlmanacOpen] = React.useState(false);
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

  const plant = (plotIndex, cropId) => handle(() => gm.plant(plotIndex, cropId), `${CROPS[cropId].name} planted!`);
  const harvest = (i) => handle(() => gm.harvest(i), (r) => `+${r.amount} ${r.cropName}`);
  const collectAnimal = (i) => handle(() => gm.collectAnimal(i), (r) => `${r.emoji} ${r.product} collected!`);
  const sell = (cropId) => handle(() => gm.sell(cropId), (r) => `Sold for $${r.earned}`);
  const sellProduct = (id) => handle(() => gm.sellProduct(id), (r) => `Sold for $${r.earned}`);
  const upgradePlot = (i) => handle(() => gm.upgradePlot(i), 'Soil upgraded!');
  const claimQuest = (id) => {
    const res = gm.claimQuest(id);
    setState({ ...gm.getState() });
    if (res.ok) Alert.alert('Quest complete!', res.lore);
    return res;
  };
  const buy = (kind, id) =>
    handle(
      () => gm.buy(kind, id),
      kind === 'plot' ? 'New plot unlocked!' : `${UPGRADES[id].name} upgraded!`
    );
  const buyAnimal = (id) => handle(() => gm.buyAnimal(id), `${ANIMALS[id].name} joins the farm!`);

  const weather = WEATHERS[state.weather] || WEATHERS.sunny;
  const night = gm.isNight();
  const bg = night ? '#1d2f42' : state.weather === 'rain' ? '#3a5a68' : state.weather === 'blessing' ? '#4a6b8a' : '#3b7a40';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <TopBar
          coins={state.coins}
          level={state.level}
          xp={state.xp}
          xpNeeded={gm.xpNeeded}
          weather={weather}
          night={night}
          onShop={() => setShopOpen(true)}
          onAlmanac={() => setAlmanacOpen(true)}
        />

        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {tab === 'farm' && (
            <>
              <PlotGrid
                plots={state.plots}
                level={state.level}
                night={night}
                onHarvest={harvest}
                onPlant={plant}
                onUpgrade={upgradePlot}
              />
              <Text style={styles.sectionTitle}>Barn — tap to sell</Text>
              <View style={styles.barnRow}>
                {Object.entries(state.barn).map(([cropId, qty]) =>
                  qty > 0 ? (
                    <TouchableOpacity key={cropId} style={styles.barnItem} onPress={() => sell(cropId)}>
                      <Text style={styles.barnEmoji}>{CROPS[cropId].emoji}</Text>
                      <Text style={styles.barnQty}>{qty}</Text>
                      <Text style={styles.barnPrice}>${CROPS[cropId].sellPrice}/ea</Text>
                    </TouchableOpacity>
                  ) : null
                )}
                {Object.values(state.barn).every((v) => v === 0) ? (
                  <Text style={styles.barnEmpty}>Your barn is empty. Harvest crops to fill it!</Text>
                ) : null}
              </View>
            </>
          )}

          {tab === 'animals' && (
            <AnimalPen
              animals={state.animals}
              products={state.products}
              onCollect={collectAnimal}
              onSellProduct={sellProduct}
              onBuy={() => setShopOpen(true)}
            />
          )}

          {tab === 'quests' && <QuestBoard quests={gm.questList()} onClaim={claimQuest} />}

          <View style={{ height: 40 }} />
        </ScrollView>

        <ShopModal
          visible={shopOpen}
          state={state}
          gm={gm}
          onClose={() => setShopOpen(false)}
          onBuy={buy}
          onBuyAnimal={buyAnimal}
        />
        <AlmanacModal
          visible={almanacOpen}
          almanac={state.almanac}
          onClose={() => setAlmanacOpen(false)}
        />
        <Toast toast={toast} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#ffd166' },
  tabText: { color: '#eaf5e6', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#3a2c00' },
  sectionTitle: { color: '#eaf5e6', fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  barnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  barnItem: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    minWidth: 84,
  },
  barnEmoji: { fontSize: 28 },
  barnQty: { color: '#fff', fontWeight: '700', fontSize: 16 },
  barnPrice: { color: '#d7ecd2', fontSize: 12 },
  barnEmpty: { color: '#d7ecd2', fontStyle: 'italic' },
});

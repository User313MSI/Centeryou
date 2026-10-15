import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CROPS, ANIMALS, UPGRADES } from '../game';

export default function ShopModal({ visible, state, gm, onClose, onBuy, onBuyAnimal }) {
  const [tab, setTab] = React.useState('land');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>🛒 Farm Shop</Text>
          <View style={styles.tabs}>
            {['land', 'animals', 'upgrades'].map((t) => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'land' ? '🟫 Land' : t === 'animals' ? '🐮 Animals' : '🔧 Upgrades'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView>
            {tab === 'land' && (
              <>
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => onBuy('plot')}
                  disabled={state.coins < gm.plotCost()}
                >
                  <Text style={styles.itemEmoji}>🟫</Text>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>New Plot</Text>
                    <Text style={styles.itemDesc}>Grow more crops at once</Text>
                  </View>
                  <Text style={[styles.itemPrice, state.coins < gm.plotCost() && styles.disabled]}>${gm.plotCost()}</Text>
                </TouchableOpacity>
                {Object.entries(CROPS).map(([id, c]) => {
                  const locked = state.level < c.unlockLevel;
                  return (
                    <View key={id} style={[styles.item, locked && styles.locked]}>
                      <Text style={styles.itemEmoji}>{c.emoji}</Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{c.name}</Text>
                        <Text style={styles.itemDesc}>
                          {locked ? `Unlocks at level ${c.unlockLevel}` : `${c.growTime}s → $${c.sellPrice}`}
                        </Text>
                      </View>
                      <Text style={styles.itemPrice}>${c.seedCost}</Text>
                    </View>
                  );
                })}
              </>
            )}

            {tab === 'animals' && (
              <>
                {Object.entries(ANIMALS).map(([id, a]) => {
                  const cost = gm.animalCost(id);
                  const locked = state.level < a.unlockLevel;
                  const canBuy = !locked && state.coins >= cost;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.item, locked && styles.locked]}
                      onPress={() => onBuyAnimal(id)}
                      disabled={!canBuy}
                    >
                      <Text style={styles.itemEmoji}>{a.emoji}</Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{a.name}</Text>
                        <Text style={styles.itemDesc}>
                          {locked ? `Unlocks at level ${a.unlockLevel}` : `${a.productEmoji} ${a.productName} every ${a.cycleTime}s`}
                        </Text>
                      </View>
                      <Text style={[styles.itemPrice, !canBuy && styles.disabled]}>${cost}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {tab === 'upgrades' && (
              <>
                {Object.entries(UPGRADES).map(([id, up]) => {
                  const lvl = state.upgrades[id] || 0;
                  const cost = up.cost * (lvl + 1);
                  const maxed = lvl >= up.maxLevel;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={styles.item}
                      onPress={() => onBuy('upgrade', id)}
                      disabled={maxed || state.coins < cost}
                    >
                      <Text style={styles.itemEmoji}>{id === 'sprinkler' ? '💧' : id === 'market' ? '🏷️' : '🏚️'}</Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{up.name} (Lv {lvl}/{up.maxLevel})</Text>
                        <Text style={styles.itemDesc}>{up.desc}</Text>
                      </View>
                      <Text style={[styles.itemPrice, (maxed || state.coins < cost) && styles.disabled]}>
                        {maxed ? 'MAX' : `$${cost}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1f3d24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 18,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  tabActive: { backgroundColor: '#ffd166' },
  tabText: { color: '#eaf5e6', fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: '#3a2c00' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  locked: { opacity: 0.45 },
  itemEmoji: { fontSize: 26, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  itemDesc: { color: '#c9e6bd', fontSize: 12, marginTop: 2 },
  itemPrice: { color: '#ffd166', fontWeight: '800', fontSize: 14 },
  disabled: { color: '#8a8a8a' },
  closeBtn: { backgroundColor: '#ffd166', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  closeText: { color: '#3a2c00', fontWeight: '800' },
});

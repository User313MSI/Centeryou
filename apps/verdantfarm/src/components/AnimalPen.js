import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ANIMALS } from '../game';

export default function AnimalPen({ animals, products, onCollect, onSellProduct, onBuy }) {
  const byId = {};
  animals.forEach((a, i) => {
    if (!byId[a.id]) byId[a.id] = [];
    byId[a.id].push(i);
  });

  return (
    <View>
      {Object.entries(byId).map(([id, indexes]) => {
        const def = ANIMALS[id];
        const prodQty = products[id] || 0;
        return (
          <View key={id} style={styles.penCard}>
            <View style={styles.penHeader}>
              <Text style={styles.penTitle}>{def.emoji} {def.name} ×{indexes.length}</Text>
              <Text style={styles.penLore}>{def.lore}</Text>
            </View>
            <View style={styles.penBody}>
              {indexes.map((i) => {
                const a = animals[i];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.animalBtn, a.ready && styles.animalReady]}
                    onPress={() => onCollect(i)}
                    accessibilityLabel={a.ready ? 'Collect product' : 'Animal producing'}
                  >
                    <Text style={styles.animalEmoji}>{def.emoji}</Text>
                    {!a.ready ? (
                      <View style={styles.prodTrack}>
                        <View style={[styles.prodFill, { width: `${(a.progress || 0) * 100}%` }]} />
                      </View>
                    ) : (
                      <Text style={styles.readyText}>{def.productEmoji}!</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.penFooter}>
              <Text style={styles.prodCount}>{def.productEmoji} {prodQty}</Text>
              <TouchableOpacity style={styles.sellBtn} onPress={() => onSellProduct(id)} disabled={prodQty === 0}>
                <Text style={styles.sellBtnText}>Sell</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={styles.buyBtn} onPress={onBuy}>
        <Text style={styles.buyBtnText}>🛒 Buy animals in the Shop</Text>
      </TouchableOpacity>
      {animals.length === 0 ? (
        <Text style={styles.empty}>No animals yet. Rook says: "A farm without a hen is just a lawn."</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  penCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  penHeader: { marginBottom: 8 },
  penTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  penLore: { color: '#c9e6bd', fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  penBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  animalBtn: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalReady: { backgroundColor: 'rgba(255,209,102,0.3)', borderWidth: 2, borderColor: '#ffd166' },
  animalEmoji: { fontSize: 30 },
  prodTrack: { width: '80%', height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  prodFill: { height: 5, backgroundColor: '#9be36a' },
  readyText: { marginTop: 2, fontSize: 14 },
  penFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  prodCount: { color: '#fff', fontWeight: '700' },
  sellBtn: { backgroundColor: '#ffd166', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  sellBtnText: { color: '#3a2c00', fontWeight: '800' },
  buyBtn: {
    backgroundColor: '#2f8fde',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buyBtnText: { color: '#fff', fontWeight: '800' },
  empty: { color: '#d7ecd2', fontStyle: 'italic', textAlign: 'center', marginTop: 12 },
});

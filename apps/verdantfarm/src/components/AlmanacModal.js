import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CROPS, ANIMALS } from '../game';

export default function AlmanacModal({ visible, almanac, onClose }) {
  const total = Object.keys(CROPS).length + Object.keys(ANIMALS).length;
  const found = Object.keys(almanac.crops).length + Object.keys(almanac.products).length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>📖 Granny Alba's Almanac</Text>
          <Text style={styles.sub}>{found}/{total} entries discovered</Text>
          <ScrollView>
            <Text style={styles.section}>Crops</Text>
            {Object.entries(CROPS).map(([id, c]) => {
              const known = !!almanac.crops[id];
              return (
                <View key={id} style={[styles.entry, !known && styles.unknown]}>
                  <Text style={styles.entryEmoji}>{known ? c.emoji : '❓'}</Text>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{known ? c.name : '???'}</Text>
                    {known ? <Text style={styles.entryLore}>{c.lore}</Text> : null}
                  </View>
                </View>
              );
            })}
            <Text style={styles.section}>Animal Products</Text>
            {Object.entries(ANIMALS).map(([id, a]) => {
              const known = !!almanac.products[id];
              return (
                <View key={id} style={[styles.entry, !known && styles.unknown]}>
                  <Text style={styles.entryEmoji}>{known ? a.productEmoji : '❓'}</Text>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{known ? a.productName : '???'}</Text>
                    {known ? <Text style={styles.entryLore}>{a.lore}</Text> : null}
                  </View>
                </View>
              );
            })}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', margin: 24 },
  sheet: { backgroundColor: '#2a1e10', borderRadius: 18, maxHeight: '80%', padding: 18 },
  title: { color: '#ffe9b3', fontSize: 20, fontWeight: '800' },
  sub: { color: '#d9c39a', marginTop: 2, marginBottom: 10 },
  section: { color: '#ffe9b3', fontWeight: '700', marginTop: 12, marginBottom: 6, fontSize: 13 },
  entry: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  unknown: { opacity: 0.4 },
  entryEmoji: { fontSize: 24, marginRight: 12 },
  entryInfo: { flex: 1 },
  entryName: { color: '#fff', fontWeight: '700' },
  entryLore: { color: '#d9c39a', fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  closeBtn: { backgroundColor: '#ffd166', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  closeText: { color: '#3a2c00', fontWeight: '800' },
});

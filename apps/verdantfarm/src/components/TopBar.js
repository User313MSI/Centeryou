import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TopBar({ coins, level, xp, xpNeeded, weather, night, onShop, onAlmanac }) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv {level}</Text>
        </View>
        <View style={styles.xpWrap}>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.min(100, (xp / xpNeeded) * 100)}%` }]} />
          </View>
        </View>
        <Text style={styles.weather}>{night ? '🌙' : weather.emoji}</Text>
      </View>
      <View style={styles.right}>
        <TouchableOpacity onPress={onAlmanac} accessibilityLabel="Open almanac" style={styles.iconBtn}>
          <Text style={styles.iconText}>📖</Text>
        </TouchableOpacity>
        <View style={styles.coinBadge}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{coins}</Text>
        </View>
        <TouchableOpacity style={styles.shopBtn} onPress={onShop} accessibilityLabel="Open shop">
          <Text style={styles.shopBtnText}>🛒</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  levelBadge: { backgroundColor: '#ffd166', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { color: '#3a2c00', fontWeight: '800', fontSize: 13 },
  xpWrap: { flex: 1, maxWidth: 100 },
  xpTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, backgroundColor: '#7cc46a', borderRadius: 4 },
  weather: { fontSize: 18 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },
  iconText: { fontSize: 20 },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coinEmoji: { fontSize: 14 },
  coinText: { color: '#fff', fontWeight: '800', marginLeft: 4, fontSize: 14 },
  shopBtn: { backgroundColor: '#ffd166', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  shopBtnText: { fontSize: 16 },
});

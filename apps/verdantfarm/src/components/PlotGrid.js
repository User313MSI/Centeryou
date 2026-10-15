import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CROPS } from '../game';

const TIER_COLORS = { 1: 'rgba(255,255,255,0.15)', 2: '#c98a3c', 3: '#ffd166' };

export default function PlotGrid({ plots, level, night, onHarvest, onPlant, onUpgrade }) {
  const pickCrop = (index) => {
    const available = Object.entries(CROPS).filter(([, c]) => level >= c.unlockLevel);
    if (available.length === 0) {
      Alert.alert('Verdant Farm', 'Level up to unlock more crops!');
      return;
    }
    Alert.alert('Choose a crop', 'Rook watches you plant.', [
      ...available.map(([id, c]) => ({
        text: `${c.emoji} ${c.name} — $${c.seedCost} (${c.growTime}s)`,
        onPress: () => onPlant(index, id),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const longPress = (index) => {
    const plot = plots[index];
    Alert.alert('Plot options', plot.tier >= 3 ? 'This soil is already golden.' : `Upgrade soil to tier ${plot.tier + 1}?`, [
      plot.tier < 3 ? { text: 'Upgrade', onPress: () => onUpgrade(index) } : null,
      { text: 'Close', style: 'cancel' },
    ].filter(Boolean));
  };

  return (
    <View style={styles.grid}>
      {plots.map((plot, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.plot, { borderColor: TIER_COLORS[plot.tier] }]}
          onPress={() => (plot.ready ? onHarvest(i) : !plot.crop ? pickCrop(i) : null)}
          onLongPress={() => longPress(i)}
          accessibilityLabel={plot.ready ? 'Harvest plot' : plot.crop ? 'Growing' : 'Empty plot'}
        >
          <Text style={styles.plotEmoji}>
            {plot.crop ? (plot.ready ? CROPS[plot.crop].emoji : '🌱') : night ? '🌑' : '🟫'}
          </Text>
          {plot.crop && !plot.ready ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (plot.growProgress || 0) * 100)}%` }]} />
            </View>
          ) : null}
          {plot.ready ? <Text style={styles.readyLabel}>Ready!</Text> : null}
          {plot.tier > 1 ? <Text style={styles.tierLabel}>{plot.tier === 2 ? 'Rich' : 'Golden'}</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  plot: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: 'rgba(40,28,14,0.6)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  plotEmoji: { fontSize: 34 },
  progressTrack: {
    position: 'absolute',
    bottom: 18,
    left: 6,
    right: 6,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: '#9be36a', borderRadius: 3 },
  readyLabel: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 },
  tierLabel: { position: 'absolute', top: 4, fontSize: 9, color: '#ffd166', fontWeight: '700' },
});

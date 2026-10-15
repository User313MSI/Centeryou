import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function QuestBoard({ quests, onClaim }) {
  return (
    <View>
      <Text style={styles.intro}>
        "Every harvest feeds the valley's memory. Do these things, farmer." — Rook
      </Text>
      {quests.map((q) => (
        <View key={q.id} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.title}>{q.title}</Text>
            <Text style={styles.reward}>🪙 {q.rewardCoins} + {q.rewardXp} XP</Text>
          </View>
          <Text style={styles.desc}>{q.desc}</Text>
          <View style={styles.trackRow}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(q.progress / q.target) * 100}%` }]} />
            </View>
            <Text style={styles.count}>{q.progress}/{q.target}</Text>
          </View>
          {q.claimed ? (
            <Text style={styles.claimed}>✓ Completed</Text>
          ) : q.done ? (
            <TouchableOpacity style={styles.claimBtn} onPress={() => onClaim(q.id)}>
              <Text style={styles.claimBtnText}>Claim reward</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: '#d7ecd2', fontStyle: 'italic', marginBottom: 14, fontSize: 13 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontWeight: '800', fontSize: 15, flex: 1 },
  reward: { color: '#ffd166', fontSize: 12, fontWeight: '700' },
  desc: { color: '#c9e6bd', fontSize: 13, marginTop: 4 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  track: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#7cc46a', borderRadius: 4 },
  count: { color: '#eaf5e6', fontSize: 12, fontWeight: '700' },
  claimBtn: {
    backgroundColor: '#ffd166',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  claimBtnText: { color: '#3a2c00', fontWeight: '800' },
  claimed: { color: '#9be36a', fontWeight: '700', marginTop: 10, textAlign: 'center' },
});

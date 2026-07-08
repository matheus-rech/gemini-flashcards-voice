import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { AnkiDeckSummary } from '../types';
import { colors } from '../theme';

// Home = a live window into Anki. Deck names and due counts come straight
// from AnkiConnect on every refresh; nothing is cached locally.

export type ConnectionState = 'checking' | 'unreachable' | 'permission' | 'connected';

interface HomeScreenProps {
  connection: ConnectionState;
  decks: AnkiDeckSummary[];
  isRefreshing: boolean;
  ankiHost: string;
  onRefresh: () => void;
  onStartReview: (deckName: string) => void;
  onShowAgent: () => void;
  onShowSettings: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  connection, decks, isRefreshing, ankiHost, onRefresh, onStartReview, onShowAgent, onShowSettings,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EchoCards</Text>
      <Text style={styles.subtitle}>Anki command center</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} onPress={onShowAgent}>
          <Text style={styles.actionText}>🤖 Echo Agent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]} onPress={onShowSettings}>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {connection === 'checking' && (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      )}

      {connection === 'unreachable' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Anki not reachable</Text>
          <Text style={styles.panelText}>
            Couldn't reach Anki at {ankiHost}. Make sure Anki Desktop is running with the AnkiConnect
            add-on (code 2055492159), and that the host in Settings points to that computer's LAN
            address. AnkiConnect must allow LAN connections ("webBindAddress": "0.0.0.0").
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onRefresh}>
            <Text style={styles.actionText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {connection === 'permission' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Permission needed</Text>
          <Text style={styles.panelText}>
            Anki is asking for permission. Approve the popup in Anki Desktop, then retry.
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onRefresh}>
            <Text style={styles.actionText}>I've approved it</Text>
          </TouchableOpacity>
        </View>
      )}

      {connection === 'connected' && (
        <FlatList
          data={decks}
          keyExtractor={deck => deck.name}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={<Text style={styles.connected}>● Connected to Anki — {decks.length} deck{decks.length === 1 ? '' : 's'}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>No decks in Anki yet. Ask the agent to create one.</Text>}
          renderItem={({ item: deck }) => {
            const queued = deck.newCount + deck.learnCount + deck.reviewCount;
            return (
              <TouchableOpacity style={styles.deckCard} onPress={() => onStartReview(deck.name)} disabled={queued === 0}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deckName}>{deck.name}</Text>
                  <Text style={styles.deckMeta}>
                    {queued > 0
                      ? `${deck.newCount} new · ${deck.learnCount} learning · ${deck.reviewCount} review — tap to study`
                      : 'Nothing queued'}
                  </Text>
                </View>
                {queued > 0 && (
                  <View style={styles.dueBadge}><Text style={styles.dueBadgeText}>{queued}</Text></View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: colors.text, fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'center' },
  actionButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  actionText: { color: colors.text, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, marginTop: 16 },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  panelText: { color: colors.textMuted, lineHeight: 20 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  connected: { color: '#4ade80', marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  deckCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  deckName: { color: colors.text, fontSize: 18, fontWeight: '600' },
  deckMeta: { color: colors.textMuted, marginTop: 2 },
  dueBadge: { backgroundColor: colors.primary, borderRadius: 999, minWidth: 34, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  dueBadgeText: { color: colors.text, fontWeight: '700' },
});

export default HomeScreen;

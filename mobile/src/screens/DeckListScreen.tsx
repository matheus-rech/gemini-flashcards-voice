import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Deck } from '../types';
import { colors } from '../theme';

export interface DeckWithCounts extends Deck {
  due: number;
  total: number;
}

interface DeckListScreenProps {
  decks: DeckWithCounts[];
  onStartReview: (deck: Deck) => void;
  onSyncAnki: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onShowGenerate: () => void;
  onShowAnkiImport: () => void;
  onShowSettings: () => void;
}

const DeckListScreen: React.FC<DeckListScreenProps> = ({
  decks, onStartReview, onSyncAnki, onDeleteDeck, onShowGenerate, onShowAnkiImport, onShowSettings,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EchoCards</Text>
      <Text style={styles.subtitle}>Your voice-powered study partner</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.warning }]} onPress={onShowGenerate}>
          <Text style={styles.actionText}>AI Deck</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.anki }]} onPress={onShowAnkiImport}>
          <Text style={styles.actionText}>Import from Anki</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]} onPress={onShowSettings}>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={decks}
        keyExtractor={deck => deck.id}
        ListEmptyComponent={<Text style={styles.empty}>No decks yet. Create one with AI or import from Anki.</Text>}
        renderItem={({ item: deck }) => (
          <View style={styles.deckCard}>
            <Text style={styles.deckName}>{deck.name}</Text>
            <Text style={styles.deckMeta}>
              {deck.due} due / {deck.total} cards{deck.ankiDeckName ? `  ·  linked to Anki: ${deck.ankiDeckName}` : ''}
            </Text>
            <View style={styles.deckButtons}>
              <TouchableOpacity
                style={[styles.deckButton, { backgroundColor: deck.due > 0 ? colors.primary : colors.surfaceAlt }]}
                onPress={() => onStartReview(deck)}
              >
                <Text style={styles.actionText}>Review</Text>
              </TouchableOpacity>
              {deck.ankiDeckName ? (
                <TouchableOpacity style={[styles.deckButton, { backgroundColor: colors.anki }]} onPress={() => onSyncAnki(deck)}>
                  <Text style={styles.actionText}>Sync Anki</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={[styles.deckButton, { backgroundColor: colors.danger }]} onPress={() => onDeleteDeck(deck)}>
                <Text style={styles.actionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: colors.text, fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' },
  actionButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  actionText: { color: colors.text, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  deckCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  deckName: { color: colors.text, fontSize: 20, fontWeight: '600' },
  deckMeta: { color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  deckButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  deckButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});

export default DeckListScreen;

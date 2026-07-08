import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { AppSettings } from '../types';
import { ankiConnectService, mapAnkiNoteToCard } from '../services/ankiConnectService';
import { storageService } from '../services/storageService';
import { colors } from '../theme';

interface AnkiImportScreenProps {
  settings: AppSettings;
  onDone: (importedDeckName: string | null) => void;
}

type Phase = 'checking' | 'unreachable' | 'permission' | 'pick' | 'importing';

const AnkiImportScreen: React.FC<AnkiImportScreenProps> = ({ settings, onDone }) => {
  const [phase, setPhase] = useState<Phase>('checking');
  const [ankiDecks, setAnkiDecks] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  const host = settings.ankiConnectHost;

  const connect = useCallback(async () => {
    setPhase('checking');
    setError('');
    const available = await ankiConnectService.isAvailable(host);
    if (!available) {
      setPhase('unreachable');
      return;
    }
    const granted = await ankiConnectService.requestPermission(host);
    if (!granted) {
      setPhase('permission');
      return;
    }
    try {
      setAnkiDecks(await ankiConnectService.deckNames(host));
      setPhase('pick');
    } catch {
      setPhase('unreachable');
    }
  }, [host]);

  useEffect(() => { connect(); }, [connect]);

  const handleImport = async () => {
    if (!selected) return;
    setPhase('importing');
    try {
      const noteIds = await ankiConnectService.findNotes(host, selected);
      const notes = await ankiConnectService.notesInfo(host, noteIds);
      const cardIds = await ankiConnectService.findCards(host, selected);
      const cardsInfo = await ankiConnectService.cardsInfo(host, cardIds);
      // Map each note to its first generated card id (Basic = 1:1 note:card).
      const noteIdToCardId = new Map<number, number>();
      cardsInfo.forEach(ci => { if (!noteIdToCardId.has(ci.note)) noteIdToCardId.set(ci.note, ci.cardId); });

      const deck = await storageService.createDeck(selected, selected);
      const mappable = notes
        .map(note => ({ note, mapped: mapAnkiNoteToCard(note) }))
        .filter(({ mapped }) => mapped.question && mapped.answer) // skip Cloze etc.
        .map(({ note, mapped }) => ({
          ...mapped,
          ankiNoteId: note.noteId,
          ankiCardId: noteIdToCardId.get(note.noteId),
        }));
      await storageService.createCards(deck.id, mappable);
      onDone(deck.name);
    } catch {
      setError('Import failed. Make sure Anki Desktop is still running, then try again.');
      setPhase('pick');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import from Anki</Text>
      <Text style={styles.subtitle}>Connecting to {host}</Text>

      {phase === 'checking' && <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />}

      {phase === 'unreachable' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Anki not reachable</Text>
          <Text style={styles.panelText}>
            Make sure Anki Desktop is running on your computer with the AnkiConnect add-on (code 2055492159),
            and that the host above points to that computer's LAN address (not localhost). AnkiConnect must
            allow LAN connections: set "webBindAddress": "0.0.0.0" in its config. You can change the host in Settings.
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={connect}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'permission' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Permission needed</Text>
          <Text style={styles.panelText}>
            Anki is asking for permission. Look at Anki Desktop for the approval popup, click Yes/Allow, then retry.
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={connect}>
            <Text style={styles.buttonText}>I've approved it</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'pick' && (
        <>
          <FlatList
            style={{ flex: 1, marginTop: 16 }}
            data={ankiDecks}
            keyExtractor={name => name}
            ListEmptyComponent={<Text style={styles.panelText}>No decks found in Anki.</Text>}
            renderItem={({ item: name }) => (
              <TouchableOpacity
                style={[styles.deckRow, selected === name && { backgroundColor: colors.accent }]}
                onPress={() => setSelected(name)}
              >
                <Text style={styles.buttonText}>{name}</Text>
              </TouchableOpacity>
            )}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: selected ? colors.anki : colors.surfaceAlt }]}
            onPress={handleImport}
            disabled={!selected}
          >
            <Text style={styles.buttonText}>Import "{selected ?? '…'}"</Text>
          </TouchableOpacity>
        </>
      )}

      {phase === 'importing' && (
        <View style={styles.panel}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.panelText, { textAlign: 'center', marginTop: 12 }]}>Importing "{selected}"…</Text>
        </View>
      )}

      <TouchableOpacity style={styles.exitLink} onPress={() => onDone(null)}>
        <Text style={{ color: colors.textMuted }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  panel: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, marginTop: 24 },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  panelText: { color: colors.textMuted, lineHeight: 20 },
  deckRow: { backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 8 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  buttonText: { color: colors.text, fontWeight: '700' },
  error: { color: '#f87171', textAlign: 'center', marginTop: 8 },
  exitLink: { alignItems: 'center', padding: 12 },
});

export default AnkiImportScreen;

import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppSettings, Deck, DEFAULT_SETTINGS, Rating } from './src/types';
import { storageService } from './src/services/storageService';
import { ankiConnectService } from './src/services/ankiConnectService';
import { calculateNextReview } from './src/services/fsrs';
import { colors } from './src/theme';
import DeckListScreen, { DeckWithCounts } from './src/screens/DeckListScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import GenerateDeckScreen from './src/screens/GenerateDeckScreen';
import AnkiImportScreen from './src/screens/AnkiImportScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type Screen =
  | { name: 'decks' }
  | { name: 'review'; deck: Deck }
  | { name: 'generate' }
  | { name: 'ankiImport' }
  | { name: 'settings' };

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    (globalThis as any).alert?.(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'decks' });
  const [decks, setDecks] = useState<DeckWithCounts[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const refreshDecks = useCallback(async () => {
    const loaded = await storageService.getDecks();
    const withCounts = await Promise.all(
      loaded.map(async deck => ({ ...deck, ...(await storageService.countDueForDeck(deck.id)) })),
    );
    setDecks(withCounts);
  }, []);

  useEffect(() => {
    storageService.getSettings().then(setSettings);
    refreshDecks();
  }, [refreshDecks]);

  const goHome = useCallback(() => {
    refreshDecks();
    setScreen({ name: 'decks' });
  }, [refreshDecks]);

  const handleDeleteDeck = useCallback((deck: Deck) => {
    const doDelete = async () => {
      await storageService.deleteDeck(deck.id);
      refreshDecks();
    };
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm?.(`Delete "${deck.name}" and all its cards?`)) doDelete();
    } else {
      Alert.alert('Delete deck', `Delete "${deck.name}" and all its cards?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [refreshDecks]);

  // PULL sync: fetch native-Anki reviews done since the last sync and replay
  // each rating through EchoCards' own FSRS scheduler.
  const handleSyncAnki = useCallback(async (deck: Deck) => {
    if (!deck.ankiDeckName) return;
    const host = settings.ankiConnectHost;
    try {
      if (!(await ankiConnectService.isAvailable(host))) {
        notify('Anki not reachable', `Couldn't reach Anki at ${host}. Check Settings and make sure Anki Desktop is running.`);
        return;
      }
      const meta = await storageService.getAnkiSyncMeta();
      const lastSyncedTime = meta[deck.id]?.lastSyncedReviewTime ?? 0;
      const reviews = await ankiConnectService.cardReviewsSince(host, deck.ankiDeckName, lastSyncedTime);
      const sorted = [...reviews].sort((a, b) => a[0] - b[0]);

      let applied = 0;
      let maxReviewTime = lastSyncedTime;
      for (const [reviewTime, cardId, , ease] of sorted) {
        if (reviewTime <= lastSyncedTime) continue;
        const card = await storageService.findCardByAnkiCardId(cardId);
        if (card && ease >= 1 && ease <= 4) {
          await storageService.updateCard(calculateNextReview(card, ease as Rating));
          applied++;
        }
        maxReviewTime = Math.max(maxReviewTime, reviewTime);
      }
      await storageService.setAnkiSyncMetaForDeck(deck.id, maxReviewTime);
      refreshDecks();
      notify('Sync complete', applied > 0
        ? `Applied ${applied} review${applied === 1 ? '' : 's'} you did in Anki to "${deck.name}".`
        : `No new Anki reviews found for "${deck.name}".`);
    } catch {
      notify('Sync failed', 'Something went wrong syncing with Anki. Make sure Anki Desktop is still running.');
    }
  }, [settings.ankiConnectHost, refreshDecks]);

  const handleSaveSettings = useCallback(async (next: AppSettings) => {
    await storageService.setSettings(next);
    setSettings(next);
    setScreen({ name: 'decks' });
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {screen.name === 'decks' && (
        <DeckListScreen
          decks={decks}
          onStartReview={deck => setScreen({ name: 'review', deck })}
          onSyncAnki={handleSyncAnki}
          onDeleteDeck={handleDeleteDeck}
          onShowGenerate={() => setScreen({ name: 'generate' })}
          onShowAnkiImport={() => setScreen({ name: 'ankiImport' })}
          onShowSettings={() => setScreen({ name: 'settings' })}
        />
      )}
      {screen.name === 'review' && (
        <ReviewScreen deck={screen.deck} settings={settings} onDone={goHome} />
      )}
      {screen.name === 'generate' && (
        <GenerateDeckScreen
          settings={settings}
          onDone={createdDeckName => {
            if (createdDeckName) notify('Deck created', `"${createdDeckName}" is ready to review.`);
            goHome();
          }}
        />
      )}
      {screen.name === 'ankiImport' && (
        <AnkiImportScreen
          settings={settings}
          onDone={importedDeckName => {
            if (importedDeckName) notify('Deck imported', `"${importedDeckName}" is now linked to Anki.`);
            goHome();
          }}
        />
      )}
      {screen.name === 'settings' && (
        <SettingsScreen settings={settings} onSave={handleSaveSettings} onCancel={goHome} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});

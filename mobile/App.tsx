import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AnkiDeckSummary, AppSettings, DEFAULT_SETTINGS } from './src/types';
import { settingsService } from './src/services/settingsService';
import { ankiConnectService } from './src/services/ankiConnectService';
import { colors } from './src/theme';
import HomeScreen, { ConnectionState } from './src/screens/HomeScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import AgentScreen from './src/screens/AgentScreen';
import VoiceScreen from './src/screens/VoiceScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// EchoCards Command Center: Anki Desktop is the source of truth for every
// deck, card, and due date. This app is a remote control — a live review
// surface plus an AI agent that operates on Anki through AnkiConnect.

type Screen =
  | { name: 'home' }
  | { name: 'review'; deckName: string }
  | { name: 'agent' }
  | { name: 'voice' }
  | { name: 'settings' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('checking');
  const [decks, setDecks] = useState<AnkiDeckSummary[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const connectAndLoad = useCallback(async (currentSettings: AppSettings) => {
    setConnection('checking');
    const host = currentSettings.ankiConnectHost;
    if (!(await ankiConnectService.isAvailable(host))) {
      setConnection('unreachable');
      return;
    }
    if (!(await ankiConnectService.requestPermission(host))) {
      setConnection('permission');
      return;
    }
    try {
      const stats = await ankiConnectService.getDeckStats(host);
      setDecks(stats.map(d => ({
        name: d.name, newCount: d.newCount, learnCount: d.learnCount, reviewCount: d.reviewCount,
      })));
      setConnection('connected');
    } catch {
      setConnection('unreachable');
    }
  }, []);

  useEffect(() => {
    settingsService.get().then(loaded => {
      setSettings(loaded);
      setSettingsLoaded(true);
      connectAndLoad(loaded);
    });
  }, [connectAndLoad]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await connectAndLoad(settings);
    setIsRefreshing(false);
  }, [connectAndLoad, settings]);

  const handleSaveSettings = useCallback(async (next: AppSettings) => {
    await settingsService.set(next);
    setSettings(next);
    setScreen({ name: 'home' });
    connectAndLoad(next);
  }, [connectAndLoad]);

  const goHome = useCallback(() => {
    setScreen({ name: 'home' });
    if (settingsLoaded) connectAndLoad(settings);
  }, [connectAndLoad, settings, settingsLoaded]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {screen.name === 'home' && (
        <HomeScreen
          connection={connection}
          decks={decks}
          isRefreshing={isRefreshing}
          ankiHost={settings.ankiConnectHost}
          onRefresh={handleRefresh}
          onStartReview={deckName => setScreen({ name: 'review', deckName })}
          onShowAgent={() => setScreen({ name: 'agent' })}
          onShowVoice={() => setScreen({ name: 'voice' })}
          onShowSettings={() => setScreen({ name: 'settings' })}
        />
      )}
      {screen.name === 'voice' && (
        <VoiceScreen
          settings={settings}
          onStartReview={deckName => setScreen({ name: 'review', deckName })}
          onBack={goHome}
        />
      )}
      {screen.name === 'review' && (
        <ReviewScreen deckName={screen.deckName} settings={settings} onDone={goHome} />
      )}
      {screen.name === 'agent' && (
        <AgentScreen
          settings={settings}
          onStartReview={deckName => setScreen({ name: 'review', deckName })}
          onBack={goHome}
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

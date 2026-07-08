import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { AppSettings } from '../types';
import { colors } from '../theme';

interface SettingsScreenProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onCancel: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onSave, onCancel }) => {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [ankiConnectHost, setAnkiConnectHost] = useState(settings.ankiConnectHost);
  const [speakCards, setSpeakCards] = useState(settings.speakCards);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Gemini API key</Text>
      <Text style={styles.hint}>Used for AI deck generation and explanations. Get one at ai.google.dev. Stored only on this device.</Text>
      <TextInput
        style={styles.input}
        value={geminiApiKey}
        onChangeText={setGeminiApiKey}
        placeholder="AIza…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      <Text style={styles.label}>AnkiConnect host</Text>
      <Text style={styles.hint}>
        The LAN address of the computer running Anki Desktop with the AnkiConnect add-on, e.g.
        http://192.168.1.20:8765. AnkiConnect must allow LAN connections ("webBindAddress": "0.0.0.0").
      </Text>
      <TextInput
        style={styles.input}
        value={ankiConnectHost}
        onChangeText={setAnkiConnectHost}
        placeholder="http://192.168.1.20:8765"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Read cards aloud</Text>
          <Text style={styles.hint}>Speaks each question and answer point-by-point during review.</Text>
        </View>
        <Switch value={speakCards} onValueChange={setSpeakCards} trackColor={{ true: colors.accent }} />
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => onSave({ geminiApiKey: geminiApiKey.trim(), ankiConnectHost: ankiConnectHost.trim().replace(/\/$/, ''), speakCards })}
      >
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.surfaceAlt }]} onPress={onCancel}>
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  label: { color: colors.text, fontWeight: '600', marginBottom: 4 },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 8, lineHeight: 17 },
  input: {
    backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: 10,
    padding: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.border,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  buttonText: { color: colors.text, fontWeight: '700' },
});

export default SettingsScreen;

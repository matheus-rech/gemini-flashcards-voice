import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { AppSettings } from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { colors } from '../theme';

interface GenerateDeckScreenProps {
  settings: AppSettings;
  onDone: (createdDeckName: string | null) => void;
}

const DEPTHS = ['Beginner', 'Intermediate', 'Expert'] as const;

const GenerateDeckScreen: React.FC<GenerateDeckScreenProps> = ({ settings, onDone }) => {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<(typeof DEPTHS)[number]>('Beginner');
  const [count, setCount] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!settings.geminiApiKey) {
      setError('Add your Gemini API key in Settings first.');
      return;
    }
    if (!topic.trim()) {
      setError('Enter a topic.');
      return;
    }
    const numberOfCards = Math.max(1, Math.min(50, parseInt(count, 10) || 10));
    setIsGenerating(true);
    setError('');
    try {
      const cards = await geminiService.generateDeckFromTopic(settings.geminiApiKey, topic.trim(), depth, numberOfCards);
      if (cards.length === 0) throw new Error('No cards generated');
      const deck = await storageService.createDeck(topic.trim());
      await storageService.createCards(deck.id, cards);
      onDone(deck.name);
    } catch (e) {
      setError('Generation failed. Check your API key and connection, then try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>AI Deck Generator</Text>
      <Text style={styles.subtitle}>Tell me a topic and I'll build the flashcards.</Text>

      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder='Topic, e.g. "Photosynthesis"'
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Difficulty</Text>
      <View style={styles.depthRow}>
        {DEPTHS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.depthButton, depth === d && { backgroundColor: colors.accent }]}
            onPress={() => setDepth(d)}
          >
            <Text style={styles.buttonText}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Number of cards (1–50)</Text>
      <TextInput
        style={styles.input}
        value={count}
        onChangeText={setCount}
        keyboardType="number-pad"
        placeholder="10"
        placeholderTextColor={colors.textMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.warning }]}
        onPress={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating
          ? <ActivityIndicator color={colors.text} />
          : <Text style={styles.buttonText}>Generate Deck</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.surfaceAlt }]} onPress={() => onDone(null)}>
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  label: { color: colors.textMuted, marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: 10,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  depthRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  depthButton: { flex: 1, backgroundColor: colors.surfaceAlt, padding: 12, borderRadius: 10, alignItems: 'center' },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  buttonText: { color: colors.text, fontWeight: '700' },
  error: { color: '#f87171', textAlign: 'center', marginTop: 4 },
});

export default GenerateDeckScreen;

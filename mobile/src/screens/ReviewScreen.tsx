import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import { AnkiReviewCard, AppSettings } from '../types';
import { ankiConnectService } from '../services/ankiConnectService';
import { colors } from '../theme';

// Reviews run DIRECTLY against Anki: the due queue is fetched live and every
// rating is applied through Anki's own scheduler (answerCards). This app
// stores nothing.

interface ReviewScreenProps {
  deckName: string;
  settings: AppSettings;
  onDone: () => void;
}

const RATINGS: { ease: 1 | 2 | 3 | 4; label: string; color: string }[] = [
  { ease: 1, label: 'Again', color: colors.danger },
  { ease: 2, label: 'Hard', color: colors.warning },
  { ease: 3, label: 'Good', color: colors.primary },
  { ease: 4, label: 'Easy', color: colors.success },
];

const ReviewScreen: React.FC<ReviewScreenProps> = ({ deckName, settings, onDone }) => {
  const [queue, setQueue] = useState<AnkiReviewCard[] | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState('');

  const currentCard = queue?.[0] ?? null;

  const speak = useCallback((text: string) => {
    if (!settings.speakCards) return;
    Speech.stop();
    Speech.speak(text, { language: 'en-US' });
  }, [settings.speakCards]);

  useEffect(() => {
    ankiConnectService.getDueCards(settings.ankiConnectHost, deckName)
      .then(setQueue)
      .catch(() => setError('Could not load due cards from Anki. Is Anki Desktop still running?'));
    return () => { Speech.stop(); };
  }, [deckName, settings.ankiConnectHost]);

  // Read each card point-by-point: question when it appears, answer on reveal.
  useEffect(() => {
    if (currentCard && !showAnswer) speak(currentCard.question);
  }, [currentCard, showAnswer, speak]);

  const handleReveal = () => {
    if (!currentCard) return;
    setShowAnswer(true);
    speak(`${currentCard.answer}. How did you do? Rate Again, Hard, Good, or Easy.`);
  };

  const handleRate = async (ease: 1 | 2 | 3 | 4) => {
    if (!currentCard || !queue) return;
    try {
      await ankiConnectService.answerCard(settings.ankiConnectHost, currentCard.cardId, ease);
    } catch {
      setError('Rating failed — lost connection to Anki. The card stays in the queue.');
      return;
    }
    setError('');
    setShowAnswer(false);
    setReviewed(r => r + 1);
    const remaining = queue.slice(1);
    setQueue(remaining);
    if (remaining.length === 0) {
      speak('Review complete! Well done.');
    }
  };

  if (queue === null && !error) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  if (error && !currentCard) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>Connection problem</Text>
        <Text style={styles.doneMeta}>{error}</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={onDone}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>{reviewed > 0 ? 'Review complete! 🎉' : 'No cards due'}</Text>
        <Text style={styles.doneMeta}>
          {reviewed > 0
            ? `You reviewed ${reviewed} card${reviewed === 1 ? '' : 's'} in "${deckName}" — all recorded in Anki.`
            : `"${deckName}" has no cards due right now.`}
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={onDone}>
          <Text style={styles.buttonText}>Back to decks</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>{deckName} · {queue?.length ?? 0} due</Text>
      <ScrollView style={styles.cardArea} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>QUESTION</Text>
          <Text style={styles.cardText}>{currentCard.question}</Text>
          {showAnswer && (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>ANSWER</Text>
              <Text style={styles.cardText}>{currentCard.answer}</Text>
            </>
          )}
        </View>
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!showAnswer ? (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleReveal}>
          <Text style={styles.buttonText}>Show Answer</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.ratingRow}>
          {RATINGS.map(({ ease, label, color }) => (
            <TouchableOpacity key={label} style={[styles.ratingButton, { backgroundColor: color }]} onPress={() => handleRate(ease)}>
              <Text style={styles.buttonText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.exitLink} onPress={onDone}>
        <Text style={{ color: colors.textMuted }}>End review</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  progress: { color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  cardArea: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 24 },
  cardLabel: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  cardText: { color: colors.text, fontSize: 22, lineHeight: 30 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  buttonText: { color: colors.text, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  ratingButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  doneTitle: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
  doneMeta: { color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  error: { color: '#f87171', textAlign: 'center', marginTop: 8 },
  exitLink: { alignItems: 'center', padding: 12 },
});

export default ReviewScreen;

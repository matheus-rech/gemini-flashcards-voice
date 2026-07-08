import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import { Card, Deck, Rating, AppSettings } from '../types';
import { calculateNextReview } from '../services/fsrs';
import { storageService } from '../services/storageService';
import { ankiConnectService } from '../services/ankiConnectService';
import { geminiService } from '../services/geminiService';
import { colors } from '../theme';

interface ReviewScreenProps {
  deck: Deck;
  settings: AppSettings;
  onDone: () => void;
}

const RATINGS: { rating: Rating; label: string; color: string }[] = [
  { rating: Rating.AGAIN, label: 'Again', color: colors.danger },
  { rating: Rating.HARD, label: 'Hard', color: colors.warning },
  { rating: Rating.GOOD, label: 'Good', color: colors.primary },
  { rating: Rating.EASY, label: 'Easy', color: colors.success },
];

const ReviewScreen: React.FC<ReviewScreenProps> = ({ deck, settings, onDone }) => {
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const currentCard = queue?.[0] ?? null;

  const speak = useCallback((text: string) => {
    if (!settings.speakCards) return;
    Speech.stop();
    Speech.speak(text, { language: 'en-US' });
  }, [settings.speakCards]);

  useEffect(() => {
    storageService.getDueCardsForDeck(deck.id).then(setQueue);
    return () => { Speech.stop(); };
  }, [deck.id]);

  // Read each card point-by-point: question when it appears, answer on reveal.
  useEffect(() => {
    if (currentCard && !showAnswer) speak(currentCard.question);
  }, [currentCard, showAnswer, speak]);

  const handleReveal = () => {
    if (!currentCard) return;
    setShowAnswer(true);
    speak(`${currentCard.answer}. How did you do? Rate Again, Hard, Good, or Easy.`);
  };

  const handleRate = async (rating: Rating) => {
    if (!currentCard || !queue) return;
    const updated = calculateNextReview(currentCard, rating);
    await storageService.updateCard(updated);

    // Fire-and-forget push of the same rating into Anki's own scheduler if
    // this card is linked. Never blocks the review flow.
    if (updated.ankiCardId) {
      ankiConnectService
        .answerCard(settings.ankiConnectHost, updated.ankiCardId, rating as 1 | 2 | 3 | 4)
        .catch(() => { /* Anki unreachable — ignore */ });
    }

    setShowAnswer(false);
    setExplanation(null);
    setReviewed(r => r + 1);
    const remaining = queue.slice(1);
    setQueue(remaining);
    if (remaining.length === 0) {
      speak('Review complete! Well done.');
    }
  };

  const handleExplain = async () => {
    if (!currentCard || !settings.geminiApiKey) return;
    setIsExplaining(true);
    try {
      const text = await geminiService.getExplanation(settings.geminiApiKey, currentCard.question, currentCard.answer);
      setExplanation(text);
      speak(text);
    } catch {
      setExplanation('Could not fetch an explanation. Check your Gemini API key in Settings.');
    } finally {
      setIsExplaining(false);
    }
  };

  if (queue === null) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  if (!currentCard) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>{reviewed > 0 ? 'Review complete! 🎉' : 'No cards due'}</Text>
        <Text style={styles.doneMeta}>
          {reviewed > 0 ? `You reviewed ${reviewed} card${reviewed === 1 ? '' : 's'} in "${deck.name}".` : `"${deck.name}" has no cards due right now.`}
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={onDone}>
          <Text style={styles.buttonText}>Back to decks</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>{deck.name} · {queue.length} card{queue.length === 1 ? '' : 's'} left</Text>
      <ScrollView style={styles.cardArea} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>QUESTION</Text>
          <Text style={styles.cardText}>{currentCard.question}</Text>
          {showAnswer && (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>ANSWER</Text>
              <Text style={styles.cardText}>{currentCard.answer}</Text>
              {currentCard.explanation ? <Text style={styles.explanation}>{currentCard.explanation}</Text> : null}
              {explanation ? <Text style={styles.explanation}>{explanation}</Text> : null}
            </>
          )}
        </View>
      </ScrollView>

      {!showAnswer ? (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleReveal}>
          <Text style={styles.buttonText}>Show Answer</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.ratingRow}>
            {RATINGS.map(({ rating, label, color }) => (
              <TouchableOpacity key={label} style={[styles.ratingButton, { backgroundColor: color }]} onPress={() => handleRate(rating)}>
                <Text style={styles.buttonText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {settings.geminiApiKey ? (
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.surfaceAlt, marginTop: 8 }]} onPress={handleExplain} disabled={isExplaining}>
              <Text style={styles.buttonText}>{isExplaining ? 'Thinking…' : 'Explain this (AI)'}</Text>
            </TouchableOpacity>
          ) : null}
        </>
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
  explanation: { color: colors.textMuted, marginTop: 12, fontStyle: 'italic', lineHeight: 20 },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  buttonText: { color: colors.text, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  ratingButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  doneTitle: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
  doneMeta: { color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  exitLink: { alignItems: 'center', padding: 12 },
});

export default ReviewScreen;

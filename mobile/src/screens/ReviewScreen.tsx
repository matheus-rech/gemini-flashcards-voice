import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import { AppSettings } from '../types';
import { ankiConnectService, AnkiCurrentCard, stripHtml } from '../services/ankiConnectService';
import { colors } from '../theme';

// This screen is a live MIRROR of Anki Desktop's reviewer window. Opening it
// starts a real review in Anki (guiDeckReview); every "Show Answer" and
// rating tap here clicks the corresponding button in the Anki window
// (guiShowAnswer / guiAnswerCard). Anki's own v3 queue decides card order —
// daily limits, new cards, sibling burying and all.

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
  const [card, setCard] = useState<AnkiCurrentCard | null>(null);
  const [phase, setPhase] = useState<'loading' | 'question' | 'answer' | 'finished' | 'error'>('loading');
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState('');
  const lastSpokenCardId = useRef<number | null>(null);

  const host = settings.ankiConnectHost;

  const speak = useCallback((text: string) => {
    if (!settings.speakCards) return;
    Speech.stop();
    Speech.speak(text, { language: 'en-US' });
  }, [settings.speakCards]);

  // Pull whatever Anki's reviewer is showing right now.
  const readScreen = useCallback(async (): Promise<AnkiCurrentCard | null> => {
    const current = await ankiConnectService.guiCurrentCard(host);
    setCard(current);
    if (!current) setPhase('finished');
    return current;
  }, [host]);

  useEffect(() => {
    (async () => {
      try {
        const opened = await ankiConnectService.guiDeckReview(host, deckName);
        if (!opened) throw new Error('could not open reviewer');
        const current = await readScreen();
        if (current) setPhase('question');
      } catch {
        setError('Could not start a review in Anki. Is Anki Desktop still running?');
        setPhase('error');
      }
    })();
    return () => { Speech.stop(); };
  }, [deckName, host, readScreen]);

  // Speak each question once as it appears.
  useEffect(() => {
    if (card && phase === 'question' && lastSpokenCardId.current !== card.cardId) {
      lastSpokenCardId.current = card.cardId;
      speak(stripHtml(card.question));
    }
  }, [card, phase, speak]);

  const handleReveal = async () => {
    if (!card) return;
    try {
      await ankiConnectService.guiShowAnswer(host); // flips the card in Anki too
      const current = await readScreen();
      if (current) {
        setPhase('answer');
        const q = stripHtml(current.question);
        const full = stripHtml(current.answer);
        const backOnly = full.startsWith(q) ? full.slice(q.length).trim() : full;
        speak(`${backOnly}. How did you do?`);
      }
    } catch {
      setError('Lost connection to Anki.');
    }
  };

  const handleRate = async (ease: 1 | 2 | 3 | 4) => {
    if (!card) return;
    try {
      await ankiConnectService.guiAnswerCard(host, ease); // clicks the real button
    } catch {
      setError('Rating failed — lost connection to Anki. The card stays on screen.');
      return;
    }
    setError('');
    setReviewed(r => r + 1);
    const next = await readScreen();
    if (next) {
      setPhase('question');
    } else {
      speak('Deck finished! Well done.');
    }
  };

  const answerText = card ? (() => {
    const q = stripHtml(card.question);
    const full = stripHtml(card.answer);
    return full.startsWith(q) ? full.slice(q.length).trim() : full;
  })() : '';

  if (phase === 'loading') {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  if (phase === 'error') {
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

  if (phase === 'finished' || !card) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>{reviewed > 0 ? 'Deck finished! 🎉' : 'Nothing to review'}</Text>
        <Text style={styles.doneMeta}>
          {reviewed > 0
            ? `You reviewed ${reviewed} card${reviewed === 1 ? '' : 's'} in "${deckName}" — all done in Anki itself.`
            : `Anki has no cards queued in "${deckName}" right now (daily limits may be reached).`}
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]} onPress={onDone}>
          <Text style={styles.buttonText}>Back to decks</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>🖥 Mirroring Anki · {deckName} · {reviewed} done</Text>
      <ScrollView style={styles.cardArea} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>QUESTION</Text>
          <Text style={styles.cardText}>{stripHtml(card.question)}</Text>
          {phase === 'answer' && (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardLabel}>ANSWER</Text>
              <Text style={styles.cardText}>{answerText}</Text>
            </>
          )}
        </View>
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {phase === 'question' ? (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleReveal}>
          <Text style={styles.buttonText}>Show Answer</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.ratingRow}>
          {RATINGS.map(({ ease, label, color }, i) => (
            <TouchableOpacity key={label} style={[styles.ratingButton, { backgroundColor: color }]} onPress={() => handleRate(ease)}>
              <Text style={styles.buttonText}>{label}</Text>
              {card.nextReviews[i] ? <Text style={styles.nextReview}>{card.nextReviews[i]}</Text> : null}
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
  ratingButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  nextReview: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  doneTitle: { color: colors.text, fontSize: 26, fontWeight: 'bold' },
  doneMeta: { color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  error: { color: '#f87171', textAlign: 'center', marginTop: 8 },
  exitLink: { alignItems: 'center', padding: 12 },
});

export default ReviewScreen;

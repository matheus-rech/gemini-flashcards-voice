import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnkiSyncMeta, AppSettings, Card, Deck, DEFAULT_SETTINGS } from '../types';

// Mirrors the web app's storageService, but async on top of AsyncStorage.
// Cards keep Date objects in memory and serialize dueDate to ISO strings.

const DECKS_KEY = 'echoCards_decks';
const CARDS_KEY = 'echoCards_cards';
const SETTINGS_KEY = 'echoCards_settings';
const ANKI_SYNC_META_KEY = 'echoCards_ankiSyncMeta';

const seedDecks: Deck[] = [
  { id: 'capitals-1', name: 'World Capitals' },
];

const seedCards: Omit<Card, 'dueDate'>[] = [
  { id: 'c1', deckId: 'capitals-1', question: 'What is the capital of Japan?', answer: 'Tokyo', stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'c2', deckId: 'capitals-1', question: 'What is the capital of France?', answer: 'Paris', stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'c3', deckId: 'capitals-1', question: 'What is the capital of Canada?', answer: 'Ottawa', stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
];

async function initializeData(): Promise<void> {
  const existingDecks = await AsyncStorage.getItem(DECKS_KEY);
  if (!existingDecks) {
    await AsyncStorage.setItem(DECKS_KEY, JSON.stringify(seedDecks));
    const now = new Date().toISOString();
    await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(seedCards.map(card => ({ ...card, dueDate: now }))));
  }
}

function parseCards(cardsStr: string | null): Card[] {
  if (!cardsStr) return [];
  return JSON.parse(cardsStr).map((card: any) => ({
    ...card,
    dueDate: new Date(card.dueDate),
  }));
}

function serializeCards(cards: Card[]): string {
  return JSON.stringify(cards.map(card => ({ ...card, dueDate: card.dueDate.toISOString() })));
}

export const storageService = {
  getDecks: async (): Promise<Deck[]> => {
    await initializeData();
    return JSON.parse((await AsyncStorage.getItem(DECKS_KEY)) || '[]');
  },
  getCards: async (): Promise<Card[]> => {
    await initializeData();
    return parseCards(await AsyncStorage.getItem(CARDS_KEY));
  },
  getDueCardsForDeck: async (deckId: string): Promise<Card[]> => {
    const allCards = await storageService.getCards();
    const now = new Date();
    return allCards
      .filter(card => card.deckId === deckId && card.dueDate <= now)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  },
  countDueForDeck: async (deckId: string): Promise<{ due: number; total: number }> => {
    const allCards = await storageService.getCards();
    const now = new Date();
    const deckCards = allCards.filter(card => card.deckId === deckId);
    return { due: deckCards.filter(card => card.dueDate <= now).length, total: deckCards.length };
  },
  createDeck: async (name: string, ankiDeckName?: string): Promise<Deck> => {
    const allDecks = await storageService.getDecks();
    const newDeck: Deck = { id: `deck-${Date.now()}`, name, ...(ankiDeckName ? { ankiDeckName } : {}) };
    await AsyncStorage.setItem(DECKS_KEY, JSON.stringify([...allDecks, newDeck]));
    return newDeck;
  },
  updateDeck: async (updatedDeck: Deck): Promise<void> => {
    const allDecks = await storageService.getDecks();
    const deckIndex = allDecks.findIndex(d => d.id === updatedDeck.id);
    if (deckIndex !== -1) {
      allDecks[deckIndex] = updatedDeck;
      await AsyncStorage.setItem(DECKS_KEY, JSON.stringify(allDecks));
    }
  },
  deleteDeck: async (deckId: string): Promise<void> => {
    const allDecks = await storageService.getDecks();
    const allCards = await storageService.getCards();
    await AsyncStorage.setItem(DECKS_KEY, JSON.stringify(allDecks.filter(d => d.id !== deckId)));
    await AsyncStorage.setItem(CARDS_KEY, serializeCards(allCards.filter(c => c.deckId !== deckId)));
  },
  createCard: async (deckId: string, question: string, answer: string, explanation?: string, anki?: { ankiNoteId?: number; ankiCardId?: number }): Promise<Card> => {
    const allCards = await storageService.getCards();
    const newCard: Card = {
      id: `card-${Date.now()}-${allCards.length}`,
      deckId,
      question,
      answer,
      explanation,
      dueDate: new Date(),
      stability: 0,
      difficulty: 3,
      lapses: 0,
      reps: 0,
      state: 'NEW',
      ...(anki ?? {}),
    };
    await AsyncStorage.setItem(CARDS_KEY, serializeCards([...allCards, newCard]));
    return newCard;
  },
  createCards: async (deckId: string, cards: { question: string; answer: string; explanation?: string; ankiNoteId?: number; ankiCardId?: number }[]): Promise<number> => {
    const allCards = await storageService.getCards();
    const now = new Date();
    const newCards: Card[] = cards.map((c, i) => ({
      id: `card-${Date.now()}-${allCards.length + i}`,
      deckId,
      question: c.question,
      answer: c.answer,
      explanation: c.explanation,
      dueDate: now,
      stability: 0,
      difficulty: 3,
      lapses: 0,
      reps: 0,
      state: 'NEW',
      ...(c.ankiNoteId !== undefined ? { ankiNoteId: c.ankiNoteId } : {}),
      ...(c.ankiCardId !== undefined ? { ankiCardId: c.ankiCardId } : {}),
    }));
    await AsyncStorage.setItem(CARDS_KEY, serializeCards([...allCards, ...newCards]));
    return newCards.length;
  },
  updateCard: async (updatedCard: Card): Promise<void> => {
    const allCards = await storageService.getCards();
    const cardIndex = allCards.findIndex(c => c.id === updatedCard.id);
    if (cardIndex !== -1) {
      allCards[cardIndex] = updatedCard;
      await AsyncStorage.setItem(CARDS_KEY, serializeCards(allCards));
    }
  },
  findCardByAnkiCardId: async (ankiCardId: number): Promise<Card | null> => {
    const allCards = await storageService.getCards();
    return allCards.find(c => c.ankiCardId === ankiCardId) ?? null;
  },
  getAnkiSyncMeta: async (): Promise<AnkiSyncMeta> => {
    const raw = await AsyncStorage.getItem(ANKI_SYNC_META_KEY);
    return raw ? JSON.parse(raw) : {};
  },
  setAnkiSyncMetaForDeck: async (deckId: string, lastSyncedReviewTime: number): Promise<void> => {
    const meta = await storageService.getAnkiSyncMeta();
    meta[deckId] = { lastSyncedReviewTime };
    await AsyncStorage.setItem(ANKI_SYNC_META_KEY, JSON.stringify(meta));
  },
  getSettings: async (): Promise<AppSettings> => {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  },
  setSettings: async (settings: AppSettings): Promise<void> => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
};

export enum Rating {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
}

export interface Card {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  explanation?: string;
  // FSRS properties
  dueDate: Date;
  stability: number;
  difficulty: number;
  lapses: number;
  reps: number;
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';
  // Anki linkage (only present for cards imported from / linked to Anki)
  ankiNoteId?: number;
  ankiCardId?: number;
}

export interface Deck {
  id: string;
  name: string;
  // Anki linkage (only present for decks linked to an Anki deck)
  ankiDeckName?: string;
}

// Tracks the last native-Anki review (by epoch ms) already replayed into
// each linked deck, so a pull-sync never re-applies the same review twice.
export interface AnkiSyncMeta {
  [deckId: string]: {
    lastSyncedReviewTime: number;
  };
}

export interface AppSettings {
  geminiApiKey: string;
  // Base URL of AnkiConnect. On a phone this is NOT localhost — it's the
  // LAN address of the computer running Anki Desktop, e.g. http://192.168.1.20:8765
  ankiConnectHost: string;
  speakCards: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  ankiConnectHost: 'http://localhost:8765',
  speakCards: true,
};

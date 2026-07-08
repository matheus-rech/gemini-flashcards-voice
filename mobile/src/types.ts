// EchoCards Command Center types.
// Anki Desktop is the single source of truth for all decks, cards, and
// scheduling — this app holds no card data of its own, only settings.

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

// Scheduler-accurate per-deck queue counts, as Anki's deck browser shows
// them (from AnkiConnect's getDeckStats — not a raw card search).
export interface AnkiDeckSummary {
  name: string;
  newCount: number;
  learnCount: number;
  reviewCount: number;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
}

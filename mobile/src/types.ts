// EchoCards Command Center types.
// Anki Desktop is the single source of truth for all decks, cards, and
// scheduling — this app holds no card data of its own, only settings.

export interface AppSettings {
  geminiApiKey: string;
  // Base URL of AnkiConnect. On a phone this is NOT localhost — it's the
  // LAN address of the computer running Anki Desktop, e.g. http://192.168.1.20:8765
  ankiConnectHost: string;
  speakCards: boolean;
  // OpenAI-Realtime-compatible speech server for hands-free conversation.
  // Works with the self-hosted huggingface/speech-to-speech pipeline
  // (fallback when cloud models are unavailable, or the main option) as well
  // as any cloud endpoint speaking the same protocol. NOTE: speech-to-speech
  // also defaults to port 8765, which collides with AnkiConnect — run it on
  // 8766 (--ws_port 8766).
  realtimeVoiceUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  ankiConnectHost: 'http://localhost:8765',
  speakCards: true,
  realtimeVoiceUrl: 'ws://localhost:8766/v1/realtime',
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

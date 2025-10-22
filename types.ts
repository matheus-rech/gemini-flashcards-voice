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
  explanation?: string; // Optional field for more context
  // FSRS properties
  dueDate: Date;
  stability: number;
  difficulty: number;
  lapses: number;
  reps: number;
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';
}

export interface Deck {
  id: string;
  name: string;
}

export enum SessionState {
  IDLE = "IDLE",
  AWAITING_COMMAND = "AWAITING_COMMAND",
  READING_QUESTION = "READING_QUESTION",
  AWAITING_ANSWER_REVEAL = "AWAITING_ANSWER_REVEAL",
  READING_ANSWER = "READING_ANSWER",
  AWAITING_RATING = "AWAITING_RATING",
  PROCESSING = "PROCESSING",
  CONVERSATION = "CONVERSATION",
  EDITING_CARD = "EDITING_CARD",
  SHOWING_DECKS = "SHOWING_DECKS",
  IMPORTING_DECK = "IMPORTING_DECK",
  SHOWING_CARD_STATS = "SHOWING_CARD_STATS",
  GENERATING_IMAGE = "GENERATING_IMAGE",
  ANALYZING_IMAGE = "ANALYZING_IMAGE",
  TRANSCRIBING_AUDIO = "TRANSCRIBING_AUDIO",
  SMART_GENERATION = "SMART_GENERATION",
  ANALYZING_TEXT = "ANALYZING_TEXT",
  ERROR = "ERROR",
}

export interface TranscriptMessage {
  source: 'user' | 'assistant';
  text: string;
}

export interface StudyGoal {
  type: 'session' | 'daily';
  target: number;
}

export interface StudyProgress {
  goal: StudyGoal;
  progress: number;
  date: string; // YYYY-MM-DD
}

export enum AudioPlaybackState {
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  STOPPED = "STOPPED",
}

export type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
export const ALL_VOICES: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

// Audio Constants
export const INPUT_AUDIO_SAMPLE_RATE = 16000;
export const OUTPUT_AUDIO_SAMPLE_RATE = 24000;

// Anki Import Types
export interface AnkiNote {
  id: number;
  guid: string;
  mid: number;  // model id
  mod: number;  // modification timestamp
  tags: string;
  flds: string; // fields separated by \x1f
  sfld: string; // sort field
  csum: number; // checksum
}

export interface AnkiCard {
  id: number;
  nid: number; // note id
  did: number; // deck id
  ord: number; // ordinal (which card template)
  mod: number;
  type: number; // 0=new, 1=learning, 2=review
  queue: number; // -1=suspended, 0=new, 1=learning, 2=review
  due: number;
  ivl: number; // interval
  factor: number;
  reps: number;
  lapses: number;
  left: number;
}

export interface AnkiDeck {
  id: number;
  name: string;
}

export interface AnkiModel {
  id: number;
  name: string;
  flds: Array<{ name: string; ord: number }>;
  tmpls: Array<{ name: string; qfmt: string; afmt: string }>;
}

export interface AnkiImportResult {
  deck: Deck;
  cardsImported: number;
  errors: string[];
}
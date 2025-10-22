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
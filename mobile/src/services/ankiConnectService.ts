// Client for AnkiConnect (the Anki Desktop add-on, code 2055492159), which
// exposes a JSON-RPC-style HTTP API — by default on port 8765 of the machine
// running Anki Desktop.
//
// On a phone, "localhost" is the phone itself, so the host must be the LAN
// address of the computer running Anki (e.g. http://192.168.1.20:8765) and
// AnkiConnect's config must allow LAN connections:
//   "webBindAddress": "0.0.0.0", "webCorsOriginList": ["*"]
// The host is user-configurable in the Settings screen.

const ANKI_CONNECT_VERSION = 6;

interface AnkiConnectResponse<T> {
  result: T;
  error: string | null;
}

export interface AnkiNoteInfo {
  noteId: number;
  modelName: string;
  tags: string[];
  fields: Record<string, { value: string; order: number }>;
  cards: number[];
}

export interface AnkiCardInfo {
  cardId: number;
  note: number; // parent note id
  deckName: string;
  fields: Record<string, { value: string; order: number }>;
}

// [reviewTime, cardId, usn, ease, interval, lastInterval, factor, timeTaken, reviewType]
export type AnkiReviewTuple = [number, number, number, number, number, number, number, number, number];

async function invoke<T = unknown>(host: string, action: string, params: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(host, {
    method: 'POST',
    body: JSON.stringify({ action, version: ANKI_CONNECT_VERSION, params }),
  });
  if (!response.ok) {
    throw new Error(`AnkiConnect HTTP error: ${response.status}`);
  }
  const data: AnkiConnectResponse<T> = await response.json();
  if (data.error) {
    throw new Error(`AnkiConnect error: ${data.error}`);
  }
  return data.result;
}

export const ankiConnectService = {
  // Cheap reachability probe. Never throws.
  isAvailable: async (host: string): Promise<boolean> => {
    try {
      await invoke<number>(host, 'version');
      return true;
    } catch {
      return false;
    }
  },

  // Triggers a one-time approval popup in Anki Desktop for new origins.
  requestPermission: async (host: string): Promise<boolean> => {
    try {
      const result = await invoke<{ permission: 'granted' | 'denied' }>(host, 'requestPermission');
      return result.permission === 'granted';
    } catch {
      return false;
    }
  },

  deckNames: async (host: string): Promise<string[]> => {
    return invoke<string[]>(host, 'deckNames');
  },

  findNotes: async (host: string, ankiDeckName: string): Promise<number[]> => {
    return invoke<number[]>(host, 'findNotes', { query: `deck:"${ankiDeckName}"` });
  },

  notesInfo: async (host: string, noteIds: number[]): Promise<AnkiNoteInfo[]> => {
    return invoke<AnkiNoteInfo[]>(host, 'notesInfo', { notes: noteIds });
  },

  findCards: async (host: string, ankiDeckName: string): Promise<number[]> => {
    return invoke<number[]>(host, 'findCards', { query: `deck:"${ankiDeckName}"` });
  },

  cardsInfo: async (host: string, cardIds: number[]): Promise<AnkiCardInfo[]> => {
    return invoke<AnkiCardInfo[]>(host, 'cardsInfo', { cards: cardIds });
  },

  // PUSH path: replays one rating through Anki's own scheduler.
  answerCard: async (host: string, ankiCardId: number, ease: 1 | 2 | 3 | 4): Promise<boolean> => {
    const results = await invoke<boolean[]>(host, 'answerCards', {
      answers: [{ cardId: ankiCardId, ease }],
    });
    return results[0] ?? false;
  },

  // PULL path: review-log entries for a deck since startTimeMs (exclusive).
  cardReviewsSince: async (host: string, ankiDeckName: string, startTimeMs: number): Promise<AnkiReviewTuple[]> => {
    return invoke<AnkiReviewTuple[]>(host, 'cardReviews', { deck: ankiDeckName, startID: startTimeMs });
  },
};

// Best-effort positional field mapping (Basic / Basic-and-reversed note
// types). Cloze notes won't map cleanly — callers skip empty question/answer.
export function mapAnkiNoteToCard(note: AnkiNoteInfo): { question: string; answer: string; explanation?: string } {
  const values = Object.values(note.fields)
    .sort((a, b) => a.order - b.order)
    .map(f => f.value);
  return {
    question: values[0] ?? '',
    answer: values[1] ?? '',
    explanation: values[2] || undefined,
  };
}

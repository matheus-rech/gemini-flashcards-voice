// Client for AnkiConnect (https://foosoft.net/projects/anki-connect/), the
// Anki Desktop add-on (code 2055492159) that exposes a local JSON-RPC-style
// HTTP API on http://localhost:8765. This only works when EchoCards and Anki
// Desktop are running on the same machine — there is no cloud/AnkiWeb path.
//
// Wire format: every action is POSTed as { action, version: 6, params },
// every response comes back as { result, error }.
//
// NOTE: `cardReviewsSince` below assumes AnkiConnect's documented `cardReviews`
// action ({ deck, startID }) — this has not been exercised against a live Anki
// instance from this environment. If it doesn't match the user's installed
// AnkiConnect version, the documented fallback is `getReviewsOfCards`
// (card-scoped: { cards: number[] }), which would need `findCards` first to
// resolve the id list.

const ANKI_CONNECT_URL = 'http://localhost:8765';
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

async function invoke<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(ANKI_CONNECT_URL, {
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
  // Cheap reachability probe. Never throws — returns false if Anki Desktop
  // isn't running or the AnkiConnect add-on isn't installed.
  isAvailable: async (): Promise<boolean> => {
    try {
      await invoke<number>('version');
      return true;
    } catch {
      return false;
    }
  },

  // Must be called before any other action will succeed for a new/
  // non-allowlisted origin — triggers a one-time approval popup in Anki
  // Desktop. Resolves true only once the user approves it.
  requestPermission: async (): Promise<boolean> => {
    try {
      const result = await invoke<{ permission: 'granted' | 'denied' }>('requestPermission');
      return result.permission === 'granted';
    } catch {
      return false;
    }
  },

  deckNames: async (): Promise<string[]> => {
    return invoke<string[]>('deckNames');
  },

  createDeckInAnki: async (deckName: string): Promise<number> => {
    return invoke<number>('createDeck', { deck: deckName });
  },

  findNotes: async (ankiDeckName: string): Promise<number[]> => {
    return invoke<number[]>('findNotes', { query: `deck:"${ankiDeckName}"` });
  },

  notesInfo: async (noteIds: number[]): Promise<AnkiNoteInfo[]> => {
    return invoke<AnkiNoteInfo[]>('notesInfo', { notes: noteIds });
  },

  findCards: async (ankiDeckName: string): Promise<number[]> => {
    return invoke<number[]>('findCards', { query: `deck:"${ankiDeckName}"` });
  },

  cardsInfo: async (cardIds: number[]): Promise<AnkiCardInfo[]> => {
    return invoke<AnkiCardInfo[]>('cardsInfo', { cards: cardIds });
  },

  // Pushes a brand-new EchoCards-originated card into Anki as a "Basic" note.
  // The Basic model only has Front/Back, so explanation (if present) is
  // appended into the Back field.
  addNote: async (ankiDeckName: string, front: string, back: string): Promise<number | null> => {
    return invoke<number | null>('addNote', {
      note: {
        deckName: ankiDeckName,
        modelName: 'Basic',
        fields: { Front: front, Back: back },
        options: { allowDuplicate: false },
      },
    });
  },

  // PUSH path: replays a single EchoCards rating through Anki's own
  // scheduler via `answerCards` — equivalent to clicking Again/Hard/Good/Easy
  // in Anki's reviewer. Never attempts to write raw scheduling internals.
  answerCard: async (ankiCardId: number, ease: 1 | 2 | 3 | 4): Promise<boolean> => {
    const results = await invoke<boolean[]>('answerCards', {
      answers: [{ cardId: ankiCardId, ease }],
    });
    return results[0] ?? false;
  },

  // PULL path: fetches review-log entries for a deck since `startTimeMs`
  // (exclusive), so reviews done natively in Anki can be replayed into
  // EchoCards' own FSRS scheduler.
  cardReviewsSince: async (ankiDeckName: string, startTimeMs: number): Promise<AnkiReviewTuple[]> => {
    return invoke<AnkiReviewTuple[]>('cardReviews', { deck: ankiDeckName, startID: startTimeMs });
  },
};

// Best-effort positional field mapping: order 0 -> question, order 1 ->
// answer, order 2 -> explanation. Works cleanly for Basic and Basic (and
// reversed card) note types. Cloze and other non-Basic note types will not
// map correctly (typically yielding an empty answer) — callers should skip
// notes where question or answer comes back empty.
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

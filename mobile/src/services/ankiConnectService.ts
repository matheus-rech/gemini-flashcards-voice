// Client for AnkiConnect (the Anki Desktop add-on, code 2055492159), which
// exposes a JSON-RPC-style HTTP API — by default on port 8765 of the machine
// running Anki Desktop.
//
// Anki is the SOURCE OF TRUTH and reviews DRIVE ANKI'S REAL REVIEWER WINDOW
// via AnkiConnect's graphical (gui*) actions. This is deliberate — verified
// against the Anki source (rslib/src/scheduler/queue/builder/*): a raw
// `findCards "is:due"` query misses new cards entirely (is:due excludes
// c.type = New) and ignores daily new/review limits, sibling burying, and
// the v3 scheduler's gather/interleave ordering. Only Anki's own reviewer
// produces the true next-card sequence, so we remote-control it: the app
// "sees" the current card (guiCurrentCard) and "clicks" the real buttons
// (guiShowAnswer / guiAnswerCard, ease 1-4 = Again/Hard/Good/Easy exactly as
// in qt/aqt/reviewer.py's _answerCard).
//
// On a phone, "localhost" is the phone itself, so the host must be the LAN
// address of the computer running Anki (e.g. http://192.168.1.20:8765) and
// AnkiConnect's config must allow LAN connections:
//   "webBindAddress": "0.0.0.0", "webCorsOriginList": ["*"]

const ANKI_CONNECT_VERSION = 6;

interface AnkiConnectResponse<T> {
  result: T;
  error: string | null;
}

// What Anki's reviewer is currently showing — the agent's "eyes".
export interface AnkiCurrentCard {
  cardId: number;
  deckName: string;
  question: string; // rendered front HTML
  answer: string;   // rendered back HTML
  buttons: number[];       // e.g. [1,2,3,4]
  nextReviews: string[];   // e.g. ["<1m","<10m","4d","12d"], aligned with buttons
}

export interface AnkiDeckStats {
  name: string;
  newCount: number;
  learnCount: number;
  reviewCount: number;
  totalInDeck: number;
}

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

// Rendered Anki cards are HTML; flatten to speakable/displayable plain text.
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  createDeck: async (host: string, deckName: string): Promise<number> => {
    return invoke<number>(host, 'createDeck', { deck: deckName });
  },

  // Scheduler-accurate per-deck counts (new/learn/review), same numbers the
  // deck browser shows — NOT a raw card search.
  getDeckStats: async (host: string, deckNames?: string[]): Promise<AnkiDeckStats[]> => {
    const decks = deckNames ?? await invoke<string[]>(host, 'deckNames');
    const raw = await invoke<Record<string, { name: string; new_count: number; learn_count: number; review_count: number; total_in_deck: number }>>(
      host, 'getDeckStats', { decks },
    );
    return Object.values(raw).map(d => ({
      name: d.name,
      newCount: d.new_count,
      learnCount: d.learn_count,
      reviewCount: d.review_count,
      totalInDeck: d.total_in_deck,
    }));
  },

  // Adds notes (Basic model) directly into an Anki deck. Returns the number
  // successfully added (nulls = rejected duplicates).
  addNotes: async (host: string, deckName: string, cards: { front: string; back: string }[]): Promise<number> => {
    const results = await invoke<(number | null)[]>(host, 'addNotes', {
      notes: cards.map(c => ({
        deckName,
        modelName: 'Basic',
        fields: { Front: c.front, Back: c.back },
        options: { allowDuplicate: false },
      })),
    });
    return results.filter(r => r !== null).length;
  },

  // Triggers a collection sync with AnkiWeb on the desktop app.
  sync: async (host: string): Promise<void> => {
    await invoke<null>(host, 'sync');
  },

  // ---- GUI driver: remote-controls the actual Anki Desktop window ----

  // Opens Anki's real reviewer for a deck — Anki's own queue (daily limits,
  // sibling burying, learn-ahead, new/review interleaving) decides card order.
  guiDeckReview: async (host: string, deckName: string): Promise<boolean> => {
    return invoke<boolean>(host, 'guiDeckReview', { name: deckName });
  },

  // "Sees" what the reviewer is showing right now. Returns null when the
  // reviewer isn't active (e.g. the deck is finished — Anki shows congrats).
  guiCurrentCard: async (host: string): Promise<AnkiCurrentCard | null> => {
    try {
      const raw = await invoke<{
        cardId: number; deckName: string; question: string; answer: string;
        buttons?: number[]; nextReviews?: string[];
      } | null>(host, 'guiCurrentCard');
      if (!raw) return null;
      return {
        cardId: raw.cardId,
        deckName: raw.deckName,
        question: raw.question,
        answer: raw.answer,
        buttons: raw.buttons ?? [1, 2, 3, 4],
        nextReviews: raw.nextReviews ?? [],
      };
    } catch {
      return null; // "Gui review is not currently active"
    }
  },

  // Flips the current card in the Anki window (reveals the answer).
  guiShowAnswer: async (host: string): Promise<boolean> => {
    return invoke<boolean>(host, 'guiShowAnswer');
  },

  // Clicks a rating button on the CURRENT card in Anki's reviewer.
  // ease 1-4 = Again/Hard/Good/Easy (qt/aqt/reviewer.py _answerCard).
  guiAnswerCard: async (host: string, ease: 1 | 2 | 3 | 4): Promise<boolean> => {
    return invoke<boolean>(host, 'guiAnswerCard', { ease });
  },

  // Undoes the last action in Anki (like pressing Ctrl+Z there).
  guiUndo: async (host: string): Promise<boolean> => {
    return invoke<boolean>(host, 'guiUndo');
  },

  // Returns Anki to the deck browser screen.
  guiDeckBrowser: async (host: string): Promise<void> => {
    await invoke<unknown>(host, 'guiDeckBrowser');
  },
};

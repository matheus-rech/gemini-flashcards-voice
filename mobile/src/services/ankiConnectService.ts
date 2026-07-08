// Client for AnkiConnect (the Anki Desktop add-on, code 2055492159), which
// exposes a JSON-RPC-style HTTP API — by default on port 8765 of the machine
// running Anki Desktop.
//
// Anki is the SOURCE OF TRUTH: this app never keeps its own copy of decks,
// cards, or scheduling state. Reviews pull due cards straight from Anki and
// ratings are applied through Anki's own scheduler via `answerCards`.
//
// On a phone, "localhost" is the phone itself, so the host must be the LAN
// address of the computer running Anki (e.g. http://192.168.1.20:8765) and
// AnkiConnect's config must allow LAN connections:
//   "webBindAddress": "0.0.0.0", "webCorsOriginList": ["*"]

import { AnkiReviewCard } from '../types';

const ANKI_CONNECT_VERSION = 6;

interface AnkiConnectResponse<T> {
  result: T;
  error: string | null;
}

export interface AnkiCardInfo {
  cardId: number;
  note: number;
  deckName: string;
  question: string; // rendered front HTML
  answer: string;   // rendered back HTML
  fields: Record<string, { value: string; order: number }>;
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

  countDueCards: async (host: string, ankiDeckName: string): Promise<number> => {
    const ids = await invoke<number[]>(host, 'findCards', { query: `deck:"${ankiDeckName}" is:due` });
    return ids.length;
  },

  // Pull the current due queue for a deck, rendered and stripped to plain
  // text, capped to keep payloads sane on mobile.
  getDueCards: async (host: string, ankiDeckName: string, limit = 100): Promise<AnkiReviewCard[]> => {
    const ids = await invoke<number[]>(host, 'findCards', { query: `deck:"${ankiDeckName}" is:due` });
    if (ids.length === 0) return [];
    const info = await invoke<AnkiCardInfo[]>(host, 'cardsInfo', { cards: ids.slice(0, limit) });
    return info.map(ci => {
      const q = stripHtml(ci.question);
      // Anki's rendered answer usually contains the question above a divider;
      // drop the leading question text if present so we speak only the back.
      const fullAnswer = stripHtml(ci.answer);
      const answer = fullAnswer.startsWith(q) ? fullAnswer.slice(q.length).trim() : fullAnswer;
      return { cardId: ci.cardId, question: q, answer };
    });
  },

  // Applies one rating through Anki's own scheduler — identical to clicking
  // Again/Hard/Good/Easy in Anki's reviewer. Anki decides the next due date.
  answerCard: async (host: string, cardId: number, ease: 1 | 2 | 3 | 4): Promise<boolean> => {
    const results = await invoke<boolean[]>(host, 'answerCards', {
      answers: [{ cardId, ease }],
    });
    return results[0] ?? false;
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

  // Per-deck due summary for the home screen and the agent.
  getDeckSummaries: async (host: string): Promise<{ name: string; dueCount: number }[]> => {
    const names = await invoke<string[]>(host, 'deckNames');
    const summaries = await Promise.all(names.map(async name => ({
      name,
      dueCount: await ankiConnectService.countDueCards(host, name).catch(() => 0),
    })));
    return summaries;
  },

  // Triggers a collection sync with AnkiWeb on the desktop app.
  sync: async (host: string): Promise<void> => {
    await invoke<null>(host, 'sync');
  },
};

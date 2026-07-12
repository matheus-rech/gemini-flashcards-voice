// The command agent: a Gemini function-calling loop whose tools are
// AnkiConnect actions — including the GUI driver, so the agent can literally
// SEE what Anki Desktop's reviewer is showing (getCurrentCard) and CLICK its
// real buttons (showAnswer / answerCurrentCard / undo). The user gives
// natural-language commands; Anki is the source of truth.
//
// Uses the Gemini REST API directly — the user's API key comes from
// Settings and is stored only on-device.

import { ankiConnectService, stripHtml } from './ankiConnectService';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const AGENT_MODEL = 'gemini-2.5-flash';
const MAX_TOOL_TURNS = 8;

// Actions the agent can trigger inside the app itself.
export interface AgentAppActions {
  startReview: (deckName: string) => void;
}

interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

type GeminiPart =
  | { text: string }
  | { functionCall: FunctionCall }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

// Grounded in the Anki source and the FSRS docs: ratings are 1=Again, 2=Hard,
// 3=Good, 4=Easy; FSRS treats Again as the only failing grade; intervals are
// fuzzed ±~5% so they are not deterministic; never manipulate intervals or
// ease directly — always rate through the scheduler.
const SYSTEM_INSTRUCTION =
  `You are Echo, a voice-friendly real-time command agent for the user's Anki collection. ` +
  `Anki Desktop is the single source of truth — you operate on it directly through your tools, ` +
  `including seeing Anki's reviewer screen (getCurrentCard) and clicking its buttons ` +
  `(showAnswer, answerCurrentCard, undo). Keep replies short and speakable (1-3 sentences). ` +
  `Rating rules (FSRS): 1=Again is the ONLY failing grade; 2=Hard means recalled with much ` +
  `hesitation (a PASS — never use Hard when the user forgot); 3=Good is normal; 4=Easy was effortless. ` +
  `When the user says they forgot, rate Again. Never invent deck names — check listDecks first if unsure. ` +
  `When asked to create flashcards, write the content yourself and add it with addFlashcards (plain text preferred). ` +
  `When the user wants to study on their phone, call startReview; to drive the desktop reviewer directly, ` +
  `use openDeckReview + getCurrentCard + showAnswer + answerCurrentCard.`;

export const TOOL_DECLARATIONS = [
  {
    name: 'listDecks',
    description: 'Lists every deck with scheduler-accurate counts of new, learning, and review cards currently queued.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'createDeck',
    description: 'Creates a new empty deck in Anki.',
    parameters: {
      type: 'OBJECT',
      properties: { deckName: { type: 'STRING', description: 'Name for the new deck.' } },
      required: ['deckName'],
    },
  },
  {
    name: 'addFlashcards',
    description: 'Adds Basic flashcards (front/back) directly into an existing Anki deck. Write the card content yourself based on the user request.',
    parameters: {
      type: 'OBJECT',
      properties: {
        deckName: { type: 'STRING', description: 'Exact name of the target Anki deck.' },
        cards: {
          type: 'ARRAY',
          description: 'The flashcards to add.',
          items: {
            type: 'OBJECT',
            properties: {
              front: { type: 'STRING', description: 'Question / front of the card.' },
              back: { type: 'STRING', description: 'Answer / back of the card.' },
            },
            required: ['front', 'back'],
          },
        },
      },
      required: ['deckName', 'cards'],
    },
  },
  {
    name: 'openDeckReview',
    description: "Opens Anki Desktop's real reviewer window for a deck. Anki's own scheduler picks the cards (daily limits, new/review mix, burying).",
    parameters: {
      type: 'OBJECT',
      properties: { deckName: { type: 'STRING', description: 'Exact Anki deck name.' } },
      required: ['deckName'],
    },
  },
  {
    name: 'getCurrentCard',
    description: "Sees what Anki's reviewer is showing right now: the current card's question, answer, and the rating buttons with their next-interval labels. Returns notActive if no review is open.",
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'showAnswer',
    description: "Clicks 'Show Answer' in Anki's reviewer, flipping the current card.",
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'answerCurrentCard',
    description: "Clicks a rating button on the card currently shown in Anki's reviewer. 1=Again (fail), 2=Hard, 3=Good, 4=Easy.",
    parameters: {
      type: 'OBJECT',
      properties: { ease: { type: 'NUMBER', description: 'Rating: 1, 2, 3, or 4.' } },
      required: ['ease'],
    },
  },
  {
    name: 'undo',
    description: "Undoes the last action in Anki (like pressing Ctrl+Z there), e.g. an accidental rating.",
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'startReview',
    description: "Opens THIS phone app's review screen for a deck (which mirrors and drives Anki's reviewer) so the user can study from the phone.",
    parameters: {
      type: 'OBJECT',
      properties: { deckName: { type: 'STRING', description: 'Exact Anki deck name to review.' } },
      required: ['deckName'],
    },
  },
  {
    name: 'syncAnkiWeb',
    description: "Triggers Anki Desktop's own synchronization with AnkiWeb (cloud backup/sync).",
    parameters: { type: 'OBJECT', properties: {} },
  },
];

// Also used by the realtime voice bridge (OpenAI Realtime tool calls from a
// speech-to-speech server are executed through this same dispatcher).
export async function executeAnkiTool(host: string, call: FunctionCall, appActions: AgentAppActions): Promise<Record<string, unknown>> {
  try {
    switch (call.name) {
      case 'listDecks': {
        const stats = await ankiConnectService.getDeckStats(host);
        return {
          decks: stats.map(d => ({
            name: d.name, new: d.newCount, learning: d.learnCount, review: d.reviewCount, total: d.totalInDeck,
          })),
        };
      }
      case 'createDeck': {
        await ankiConnectService.createDeck(host, String(call.args.deckName));
        return { ok: true, deckName: call.args.deckName };
      }
      case 'addFlashcards': {
        const cards = (call.args.cards as { front: string; back: string }[]) ?? [];
        const added = await ankiConnectService.addNotes(host, String(call.args.deckName), cards);
        return { added, requested: cards.length, skippedAsDuplicates: cards.length - added };
      }
      case 'openDeckReview': {
        const ok = await ankiConnectService.guiDeckReview(host, String(call.args.deckName));
        return { ok };
      }
      case 'getCurrentCard': {
        const card = await ankiConnectService.guiCurrentCard(host);
        if (!card) return { notActive: true, note: 'No review is open in Anki right now (or the deck is finished).' };
        return {
          deckName: card.deckName,
          question: stripHtml(card.question),
          answer: stripHtml(card.answer),
          buttons: card.buttons,
          nextIntervals: card.nextReviews,
        };
      }
      case 'showAnswer': {
        const ok = await ankiConnectService.guiShowAnswer(host);
        return { ok };
      }
      case 'answerCurrentCard': {
        const ease = Number(call.args.ease);
        if (![1, 2, 3, 4].includes(ease)) return { error: 'ease must be 1, 2, 3, or 4' };
        const ok = await ankiConnectService.guiAnswerCard(host, ease as 1 | 2 | 3 | 4);
        return { ok };
      }
      case 'undo': {
        const ok = await ankiConnectService.guiUndo(host);
        return { ok };
      }
      case 'startReview': {
        appActions.startReview(String(call.args.deckName));
        return { ok: true, note: 'Review screen opened in the app (mirrors the Anki reviewer).' };
      }
      case 'syncAnkiWeb': {
        await ankiConnectService.sync(host);
        return { ok: true };
      }
      default:
        return { error: `Unknown tool: ${call.name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Tool execution failed. Is Anki Desktop running?' };
  }
}

export const agentService = {
  // Runs one user command through the agent loop. `history` carries the raw
  // Gemini contents of the conversation so far; the returned history should
  // be passed back on the next call to keep context.
  runCommand: async (
    apiKey: string,
    host: string,
    history: GeminiContent[],
    userMessage: string,
    appActions: AgentAppActions,
  ): Promise<{ reply: string; history: GeminiContent[] }> => {
    const contents: GeminiContent[] = [...history, { role: 'user', parts: [{ text: userMessage }] }];

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await fetch(`${BASE_URL}/${AGENT_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
      }
      const data = await response.json();
      const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];
      const functionCalls = parts.filter((p): p is { functionCall: FunctionCall } => 'functionCall' in p);

      if (functionCalls.length === 0) {
        const reply = parts.map(p => ('text' in p ? p.text : '')).join('').trim()
          || 'Done.';
        contents.push({ role: 'model', parts: parts.length ? parts : [{ text: reply }] });
        return { reply, history: contents };
      }

      // Execute every requested tool, then hand the results back to the model.
      contents.push({ role: 'model', parts });
      const responses: GeminiPart[] = [];
      for (const { functionCall } of functionCalls) {
        const result = await executeAnkiTool(host, functionCall, appActions);
        responses.push({ functionResponse: { name: functionCall.name, response: result } });
      }
      contents.push({ role: 'user', parts: responses });
    }

    return { reply: 'I hit my tool-call limit for one command — try breaking that into smaller steps.', history: contents };
  },
};

export type { GeminiContent };

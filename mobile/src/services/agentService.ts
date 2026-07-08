// The command agent: a Gemini function-calling loop whose tools are
// AnkiConnect actions. The user gives natural-language commands; the agent
// operates directly on the Anki collection (the source of truth) and can
// also command this app (e.g. launch a review session).
//
// Uses the Gemini REST API directly — the user's API key comes from
// Settings and is stored only on-device.

import { ankiConnectService } from './ankiConnectService';

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

const SYSTEM_INSTRUCTION =
  `You are Echo, a voice-friendly command agent for the user's Anki flashcard collection. ` +
  `Anki Desktop is the single source of truth — you operate on it directly through your tools. ` +
  `Keep replies short and speakable (1-3 sentences). When asked to create flashcards, write the ` +
  `content yourself and add it with addFlashcards; use HTML sparingly (plain text preferred). ` +
  `When the user wants to study, call startReview. Never invent deck names — check listDecks first if unsure.`;

const TOOL_DECLARATIONS = [
  {
    name: 'listDecks',
    description: 'Lists all deck names in the Anki collection with their due-card counts.',
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
    name: 'countDueCards',
    description: 'Returns how many cards are currently due in a deck.',
    parameters: {
      type: 'OBJECT',
      properties: { deckName: { type: 'STRING', description: 'Exact Anki deck name.' } },
      required: ['deckName'],
    },
  },
  {
    name: 'startReview',
    description: "Opens this app's review screen for a deck so the user can study its due cards now.",
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

async function executeTool(host: string, call: FunctionCall, appActions: AgentAppActions): Promise<Record<string, unknown>> {
  try {
    switch (call.name) {
      case 'listDecks': {
        const summaries = await ankiConnectService.getDeckSummaries(host);
        return { decks: summaries };
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
      case 'countDueCards': {
        const due = await ankiConnectService.countDueCards(host, String(call.args.deckName));
        return { deckName: call.args.deckName, due };
      }
      case 'startReview': {
        appActions.startReview(String(call.args.deckName));
        return { ok: true, note: 'Review screen opened in the app.' };
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
        const result = await executeTool(host, functionCall, appActions);
        responses.push({ functionResponse: { name: functionCall.name, response: result } });
      }
      contents.push({ role: 'user', parts: responses });
    }

    return { reply: 'I hit my tool-call limit for one command — try breaking that into smaller steps.', history: contents };
  },
};

export type { GeminiContent };

// Lightweight REST client for the Gemini API (no SDK dependency).
// The API key is user-provided at runtime (Settings screen) — it is never
// baked into the app binary.

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GENERATION_MODEL = 'gemini-2.5-pro';

export interface GeneratedCard {
  question: string;
  answer: string;
  explanation?: string;
}

async function generateContent(apiKey: string, model: string, body: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${BASE_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }
  return text;
}

export const geminiService = {
  generateDeckFromTopic: async (
    apiKey: string,
    topic: string,
    depth: 'Beginner' | 'Intermediate' | 'Expert',
    numberOfCards: number,
  ): Promise<GeneratedCard[]> => {
    const text = await generateContent(apiKey, GENERATION_MODEL, {
      contents: [{
        role: 'user',
        parts: [{
          text: `Create ${numberOfCards} flashcards about "${topic}" at a ${depth} level. ` +
            `Each card needs a clear question, a concise answer, and a short explanation for extra context.`,
        }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING' },
              answer: { type: 'STRING' },
              explanation: { type: 'STRING' },
            },
            required: ['question', 'answer'],
          },
        },
      },
    });
    const cards = JSON.parse(text) as GeneratedCard[];
    return cards.filter(c => c.question && c.answer);
  },

  getExplanation: async (apiKey: string, question: string, answer: string): Promise<string> => {
    return generateContent(apiKey, GENERATION_MODEL, {
      contents: [{
        role: 'user',
        parts: [{
          text: `A student is studying the flashcard below and wants to understand it more deeply. ` +
            `Give a friendly, clear explanation in 2-4 short sentences.\n\n` +
            `Question: ${question}\nAnswer: ${answer}`,
        }],
      }],
    });
  },
};

import JSZip from 'jszip';
import initSqlJs, { Database } from 'sql.js';
import { Card, Deck, AnkiNote, AnkiCard, AnkiDeck, AnkiModel, AnkiImportResult } from '../types';
import { storageService } from './storageService';

/**
 * Anki Service - Handles importing Anki .apkg files
 *
 * Anki .apkg files are ZIP archives containing:
 * - collection.anki2: SQLite database with all the data
 * - media: JSON file mapping media filenames
 * - numbered media files (0, 1, 2, etc.)
 *
 * This service extracts the database and converts Anki cards to our format.
 */

let SQL: any = null;

async function initializeSql() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });
  }
  return SQL;
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  // Create a temporary div element to parse HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Get text content and clean up
  let text = tmp.textContent || tmp.innerText || '';

  // Replace multiple spaces with single space
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Parse Anki card template to extract field references
 * Templates use {{Field}} syntax
 */
function extractFieldReferences(template: string): string[] {
  const fieldRegex = /\{\{([^}]+)\}\}/g;
  const fields: string[] = [];
  let match;

  while ((match = fieldRegex.exec(template)) !== null) {
    const fieldName = match[1].trim();
    // Remove any formatting directives like {{FrontSide}} or {{type:Field}}
    const cleanFieldName = fieldName.replace(/^(type|cloze|hint):/i, '');
    if (cleanFieldName && cleanFieldName !== 'FrontSide') {
      fields.push(cleanFieldName);
    }
  }

  return fields;
}

/**
 * Convert Anki scheduling data to FSRS format
 * Anki uses SM-2 algorithm, we use FSRS which is more advanced
 */
function convertAnkiSchedulingToFSRS(ankiCard: AnkiCard): {
  dueDate: Date;
  stability: number;
  difficulty: number;
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';
} {
  const now = new Date();

  // Map Anki type to our state
  let state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING' = 'NEW';
  if (ankiCard.type === 0) state = 'NEW';
  else if (ankiCard.type === 1) state = 'LEARNING';
  else if (ankiCard.type === 2) state = 'REVIEW';

  // Calculate due date
  let dueDate = new Date(now);
  if (ankiCard.queue === 2) {
    // Review cards: due is days since collection creation
    dueDate = new Date(now.getTime() + ankiCard.due * 24 * 60 * 60 * 1000);
  } else if (ankiCard.queue === 1) {
    // Learning cards: due is timestamp
    dueDate = new Date(ankiCard.due * 1000);
  }

  // Convert Anki's interval (days) to FSRS stability
  // Stability in FSRS represents retrievability decay rate
  // Higher interval = higher stability
  const stability = ankiCard.ivl > 0 ? Math.log(ankiCard.ivl + 1) * 2 : 0;

  // Convert Anki's ease factor to FSRS difficulty
  // Anki ease: typically 1300-3000 (1.3x to 3.0x)
  // FSRS difficulty: 1-10 (inverted - lower ease = higher difficulty)
  const ankiEase = ankiCard.factor / 1000;
  const difficulty = Math.max(1, Math.min(10, 10 - (ankiEase - 1) * 5));

  return {
    dueDate,
    stability,
    difficulty,
    state,
  };
}

/**
 * Parse Anki .apkg file and import cards
 */
export async function importAnkiDeck(file: File): Promise<AnkiImportResult> {
  const errors: string[] = [];
  let cardsImported = 0;
  let deck: Deck | null = null;

  try {
    // Initialize SQL.js
    await initializeSql();

    // Read the .apkg file as a ZIP
    const zipData = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(zipData);

    // Extract the collection.anki2 database
    const collectionFile = zip.file('collection.anki2');
    if (!collectionFile) {
      throw new Error('Invalid Anki package: collection.anki2 not found');
    }

    const dbData = await collectionFile.async('uint8array');
    const db: Database = new SQL.Database(dbData);

    // Extract deck information
    const decksData = db.exec('SELECT decks FROM col');
    if (decksData.length === 0) {
      throw new Error('No deck information found in Anki package');
    }

    const decksJson = JSON.parse(decksData[0].values[0][0] as string);
    const ankiDecks: AnkiDeck[] = Object.values(decksJson).map((d: any) => ({
      id: d.id,
      name: d.name,
    }));

    // Select deck to import
    let mainDeck: AnkiDeck;

    if (ankiDecks.length === 1) {
      // Only one deck, select it automatically
      mainDeck = ankiDecks[0];
    } else {
      // Multiple decks found, require user selection
      // For now, throw an error or handle as needed (e.g., return deck list)
      throw new Error(
        `Multiple decks found in Anki package: ${ankiDecks.map(d => d.name).join(', ')}. Please select which deck to import.`
      );
      // Alternatively, you could return the deck list for UI selection:
      // return { availableDecks: ankiDecks };
    }

    // Create a new deck in our system
    deck = storageService.createDeck(mainDeck.name);

    // Extract models (note types)
    const modelsData = db.exec('SELECT models FROM col');
    if (modelsData.length === 0) {
      throw new Error('No model information found in Anki package');
    }

    const modelsJson = JSON.parse(modelsData[0].values[0][0] as string);
    const ankiModels: { [key: number]: AnkiModel } = {};

    for (const modelData of Object.values(modelsJson) as any[]) {
      ankiModels[modelData.id] = {
        id: modelData.id,
        name: modelData.name,
        flds: modelData.flds.map((f: any) => ({
          name: f.name,
          ord: f.ord,
        })),
        tmpls: modelData.tmpls.map((t: any) => ({
          name: t.name,
          qfmt: t.qfmt,
          afmt: t.afmt,
        })),
      };
    }

    // Extract notes
    const notesQuery = db.exec('SELECT id, guid, mid, mod, tags, flds, sfld, csum FROM notes');
    if (notesQuery.length === 0) {
      throw new Error('No notes found in Anki package');
    }

    const notes: { [key: number]: AnkiNote } = {};
    for (const row of notesQuery[0].values) {
      const note: AnkiNote = {
        id: row[0] as number,
        guid: row[1] as string,
        mid: row[2] as number,
        mod: row[3] as number,
        tags: row[4] as string,
        flds: row[5] as string,
        sfld: row[6] as string,
        csum: row[7] as number,
      };
      notes[note.id] = note;
    }

    // Extract cards
    const cardsQuery = db.exec(
      'SELECT id, nid, did, ord, mod, type, queue, due, ivl, factor, reps, lapses, left FROM cards'
    );

    if (cardsQuery.length === 0) {
      errors.push('No cards found in Anki package');
      return { deck, cardsImported, errors };
    }

    // Process each card
    for (const row of cardsQuery[0].values) {
      try {
        const ankiCard: AnkiCard = {
          id: row[0] as number,
          nid: row[1] as number,
          did: row[2] as number,
          ord: row[3] as number,
          mod: row[4] as number,
          type: row[5] as number,
          queue: row[6] as number,
          due: row[7] as number,
          ivl: row[8] as number,
          factor: row[9] as number,
          reps: row[10] as number,
          lapses: row[11] as number,
          left: row[12] as number,
        };

        // Skip suspended cards
        if (ankiCard.queue === -1) {
          continue;
        }

        // Get the note for this card
        const note = notes[ankiCard.nid];
        if (!note) {
          errors.push(`Card ${ankiCard.id}: Note not found`);
          continue;
        }

        // Get the model for this note
        const model = ankiModels[note.mid];
        if (!model) {
          errors.push(`Card ${ankiCard.id}: Model not found`);
          continue;
        }

        // Parse note fields
        const fields = note.flds.split('\x1f');

        // Get the template for this card
        const template = model.tmpls[ankiCard.ord];
        if (!template) {
          errors.push(`Card ${ankiCard.id}: Template not found`);
          continue;
        }

        // Extract question and answer from template
        // For basic cards, try to identify front/back fields
        let question = '';
        let answer = '';
        let explanation = '';

        // Try to extract fields from templates
        const questionFields = extractFieldReferences(template.qfmt);
        const answerFields = extractFieldReferences(template.afmt);

        // Build question from template fields
        if (questionFields.length > 0) {
          const fieldValues = questionFields.map(fieldName => {
            const fieldIndex = model.flds.findIndex(f => f.name === fieldName);
            return fieldIndex >= 0 && fieldIndex < fields.length
              ? stripHtml(fields[fieldIndex])
              : '';
          }).filter(v => v);
          question = fieldValues.join(' ');
        }

        // Build answer from template fields
        if (answerFields.length > 0) {
          const fieldValues = answerFields.map(fieldName => {
            const fieldIndex = model.flds.findIndex(f => f.name === fieldName);
            return fieldIndex >= 0 && fieldIndex < fields.length
              ? stripHtml(fields[fieldIndex])
              : '';
          }).filter(v => v);
          answer = fieldValues.join(' ');
        }

        // Fallback: use first two fields as question/answer
        if (!question && fields.length > 0) {
          question = stripHtml(fields[0]);
        }
        if (!answer && fields.length > 1) {
          answer = stripHtml(fields[1]);
        }

        // Use additional fields as explanation if available
        if (fields.length > 2) {
          const extraFields = fields.slice(2)
            .map(f => stripHtml(f))
            .filter(f => f.trim());
          if (extraFields.length > 0) {
            explanation = extraFields.join('; ');
          }
        }

        // Skip cards with empty question or answer
        if (!question.trim() || !answer.trim()) {
          errors.push(`Card ${ankiCard.id}: Empty question or answer`);
          continue;
        }

        // Convert scheduling data
        const scheduling = convertAnkiSchedulingToFSRS(ankiCard);

        // Create card in our system
        const newCard: Card = {
          id: `anki-${ankiCard.id}-${Date.now()}`,
          deckId: deck.id,
          question: question.trim(),
          answer: answer.trim(),
          explanation: explanation.trim() || undefined,
          dueDate: scheduling.dueDate,
          stability: scheduling.stability,
          difficulty: scheduling.difficulty,
          lapses: ankiCard.lapses,
          reps: ankiCard.reps,
          state: scheduling.state,
        };

        // Save card to storage
        const allCards = storageService.getCards();
        allCards.push(newCard);
        localStorage.setItem(
          'echoCards_cards',
          JSON.stringify(allCards.map(card => ({
            ...card,
            dueDate: card.dueDate.toISOString()
          })))
        );

        cardsImported++;
      } catch (error) {
        errors.push(`Error processing card: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    db.close();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to import Anki deck: ${errorMessage}`);
  }

  return {
    deck: deck!,
    cardsImported,
    errors,
  };
}

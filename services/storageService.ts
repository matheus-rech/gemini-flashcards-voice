import { Card, Deck, StudyGoal, StudyProgress, VoiceName } from '../types';

const DECKS_KEY = 'echoCards_decks';
const CARDS_KEY = 'echoCards_cards';
const STUDY_PROGRESS_KEY = 'echoCards_studyProgress';
const VOICE_PREF_KEY = 'echoCards_voicePreference';
const CONVERSATIONAL_MODE_KEY = 'echoCards_conversationalMode';

const seedDecks: Deck[] = [
  { id: 'capitals-1', name: 'World Capitals' },
  { id: 'biases-1', name: 'Cognitive Biases' },
];

const seedCards: Card[] = [
  // World Capitals
  { id: 'c1', deckId: 'capitals-1', question: 'What is the capital of Japan?', answer: 'Tokyo', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'c2', deckId: 'capitals-1', question: 'What is the capital of France?', answer: 'Paris', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'c3', deckId: 'capitals-1', question: 'What is the capital of Canada?', answer: 'Ottawa', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'c4', deckId: 'capitals-1', question: 'What is the capital of Australia?', answer: 'Canberra', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'c5', deckId: 'capitals-1', question: 'What is the capital of Brazil?', answer: 'Brasília', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  // Cognitive Biases
  { id: 'b1', deckId: 'biases-1', question: 'What is Confirmation Bias?', answer: 'Favoring information that confirms preexisting beliefs.', explanation: 'It is the tendency to search for, interpret, favor, and recall information that confirms or supports one\'s preexisting beliefs.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'b2', deckId: 'biases-1', question: 'What is the Availability Heuristic?', answer: 'Overestimating the likelihood of events that are more easily recalled.', explanation: 'A mental shortcut that relies on immediate examples that come to mind when evaluating a specific topic, concept, method or decision.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'b3', deckId: 'biases-1', question: 'What is the Dunning-Kruger Effect?', answer: 'When people with low ability at a task overestimate their ability.', explanation: 'It is a cognitive bias where people with low ability at a task overestimate their ability, and conversely, experts underestimate their own ability.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'b4', deckId: 'biases-1', question: 'What is Survivorship Bias?', answer: 'Focusing on "survivors" and ignoring failures, leading to skewed conclusions.', explanation: 'The logical error of concentrating on the people or things that "survived" some process and inadvertently overlooking those that did not because of their lack of visibility.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
];

function initializeData() {
  if (!localStorage.getItem(DECKS_KEY)) {
    localStorage.setItem(DECKS_KEY, JSON.stringify(seedDecks));
  }
  if (!localStorage.getItem(CARDS_KEY)) {
    localStorage.setItem(CARDS_KEY, JSON.stringify(seedCards.map(card => ({...card, dueDate: card.dueDate.toISOString()}))));
  }
}

function parseCards(cardsStr: string | null): Card[] {
    if (!cardsStr) return [];
    return JSON.parse(cardsStr).map((card: any) => ({
        ...card,
        dueDate: new Date(card.dueDate),
    }));
}

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const storageService = {
  getDecks: (): Deck[] => {
    initializeData();
    return JSON.parse(localStorage.getItem(DECKS_KEY) || '[]');
  },
  getCards: (): Card[] => {
    initializeData();
    const cardsStr = localStorage.getItem(CARDS_KEY);
    return parseCards(cardsStr);
  },
  getDueCardsForDeck: (deckId: string): Card[] => {
    const allCards = storageService.getCards();
    const now = new Date();
    return allCards
      .filter(card => card.deckId === deckId && card.dueDate <= now)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  },
  getWeakestCard: (deckId: string): Card | null => {
    const allCards = storageService.getCards();
    const deckCards = allCards.filter(card => card.deckId === deckId);
    if (deckCards.length === 0) {
      return null;
    }
    // Find the card with the most lapses (failures). Tie-break with reps.
    return deckCards.sort((a, b) => {
      if (b.lapses !== a.lapses) {
        return b.lapses - a.lapses;
      }
      return a.reps - b.reps; // Fewer reps is "weaker"
    })[0];
  },
  updateCard: (updatedCard: Card): void => {
    const allCards = storageService.getCards();
    const cardIndex = allCards.findIndex(c => c.id === updatedCard.id);
    if (cardIndex !== -1) {
      allCards[cardIndex] = updatedCard;
      localStorage.setItem(CARDS_KEY, JSON.stringify(allCards.map(card => ({...card, dueDate: card.dueDate.toISOString()}))));
    }
  },
  findCardsByQuestion: (deckId: string, query: string): Card[] => {
    const allCards = storageService.getCards();
    const lowerCaseQuery = query.toLowerCase();
    return allCards.filter(
      card => card.deckId === deckId && card.question.toLowerCase().includes(lowerCaseQuery)
    );
  },
  createDeck: (name: string): Deck => {
    const allDecks = storageService.getDecks();
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      name,
    };
    const updatedDecks = [...allDecks, newDeck];
    localStorage.setItem(DECKS_KEY, JSON.stringify(updatedDecks));
    return newDeck;
  },
  deleteDeck: (deckId: string): boolean => {
    const allDecks = storageService.getDecks();
    const allCards = storageService.getCards();
    
    const deckExists = allDecks.some(d => d.id === deckId);
    if (!deckExists) {
      return false;
    }

    const updatedDecks = allDecks.filter(d => d.id !== deckId);
    const updatedCards = allCards.filter(c => c.deckId !== deckId);

    localStorage.setItem(DECKS_KEY, JSON.stringify(updatedDecks));
    localStorage.setItem(CARDS_KEY, JSON.stringify(updatedCards.map(card => ({...card, dueDate: card.dueDate.toISOString()}))));

    return true;
  },
  createCard: (deckId: string, question: string, answer: string, explanation?: string): Card => {
    const allCards = storageService.getCards();
    const newCard: Card = {
      id: `card-${Date.now()}`,
      deckId,
      question,
      answer,
      explanation,
      dueDate: new Date(),
      stability: 0,
      difficulty: 3,
      lapses: 0,
      reps: 0,
      state: 'NEW',
    };
    const updatedCards = [...allCards, newCard];
    localStorage.setItem(CARDS_KEY, JSON.stringify(updatedCards.map(card => ({...card, dueDate: card.dueDate.toISOString()}))));
    return newCard;
  },
  importDeckFromCsv: (deckName: string, csvContent: string): Deck => {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    const newDeck = storageService.createDeck(deckName);
    
    lines.forEach((line, index) => {
      // Simple CSV parsing, handles comma or semicolon, trims quotes
      const parts = line.split(/[,;]/).map(part => part.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        const [question, answer, explanation] = parts;
        if(question && answer) {
            storageService.createCard(newDeck.id, question, answer, explanation);
        }
      } else {
        console.warn(`Skipping malformed CSV line ${index + 1}: ${line}`);
      }
    });

    return newDeck;
  },
  getStudyProgress: (): StudyProgress | null => {
    const progressStr = localStorage.getItem(STUDY_PROGRESS_KEY);
    if (!progressStr) {
      return null;
    }

    const progressData: StudyProgress = JSON.parse(progressStr);
    const todayStr = getTodayDateString();

    // If the goal is daily and the date is old, reset progress
    if (progressData.goal.type === 'daily' && progressData.date !== todayStr) {
      progressData.progress = 0;
      progressData.date = todayStr;
      localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(progressData));
    }
    
    return progressData;
  },
  setStudyGoal: (goal: StudyGoal): StudyProgress => {
    const newStudyProgress: StudyProgress = {
      goal,
      progress: 0,
      date: getTodayDateString(),
    };
    localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(newStudyProgress));
    return newStudyProgress;
  },
  updateStudyProgress: (newProgress: number): void => {
    const progressData = storageService.getStudyProgress();
    if (progressData && progressData.goal.type === 'daily') {
      progressData.progress = newProgress;
      progressData.date = getTodayDateString(); // Ensure date is current on update
      localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(progressData));
    }
  },
  setVoicePreference: (voice: VoiceName): void => {
    localStorage.setItem(VOICE_PREF_KEY, voice);
  },
  getVoicePreference: (): VoiceName | null => {
    return localStorage.getItem(VOICE_PREF_KEY) as VoiceName | null;
  },
  setConversationalMode: (enabled: boolean): void => {
    localStorage.setItem(CONVERSATIONAL_MODE_KEY, JSON.stringify(enabled));
  },
  getConversationalMode: (): boolean => {
    const saved = localStorage.getItem(CONVERSATIONAL_MODE_KEY);
    return saved ? JSON.parse(saved) : false;
  },
};
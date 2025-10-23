import { Card, Deck, StudyGoal, StudyProgress, VoiceName } from '../types';

const DECKS_KEY = 'echoCards_decks';
const CARDS_KEY = 'echoCards_cards';
const STUDY_PROGRESS_KEY = 'echoCards_studyProgress';
const VOICE_PREF_KEY = 'echoCards_voicePreference';
const CONVERSATIONAL_MODE_KEY = 'echoCards_conversationalMode';

const seedDecks: Deck[] = [
  { id: 'capitals-1', name: 'World Capitals' },
  { id: 'biases-1', name: 'Cognitive Biases' },
  { id: 'cirurgia-1', name: 'Cirurgia Geral - Revisão' },
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
  // Cirurgia Geral - Revisão (Portuguese Medical Cards)
  { id: 'med1', deckId: 'cirurgia-1', question: 'Qual o marcador sérico de seguimento no Ca de pâncreas?', answer: 'CA19-9', explanation: 'Usado para prognóstico e seguimento do câncer de pâncreas.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med2', deckId: 'cirurgia-1', question: 'DM2 de início recente em idoso indica o quê no pâncreas?', answer: 'Associação com neoplasia', explanation: 'Diabetes mellitus tipo 2 de início recente pode ser manifestação paraneoplásica de câncer de pâncreas.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med3', deckId: 'cirurgia-1', question: 'Exame de escolha nas neoplasias sólidas abdominais (pâncreas)?', answer: 'TC contrastada', explanation: 'Tomografia computadorizada com contraste é o exame de escolha para avaliação de neoplasias pancreáticas.', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med4', deckId: 'cirurgia-1', question: 'Critério-chave para cirurgia "up-front" no pâncreas?', answer: 'Sem contato arterial e contato venoso <180° sem trombo', explanation: 'Critérios de ressecabilidade para cirurgia imediata em neoplasia pancreática.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med5', deckId: 'cirurgia-1', question: 'Caprini ≥3 define qual risco?', answer: 'Moderado', explanation: 'Escore de Caprini ≥3 indica risco moderado e já exige profilaxia farmacológica para tromboembolismo venoso.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med6', deckId: 'cirurgia-1', question: 'Quando iniciar HBPM 12 h antes?', answer: 'Alto risco TEV + baixo risco de sangramento', explanation: 'Heparina de baixo peso molecular 12h antes da cirurgia em pacientes de alto risco para TEV e baixo risco de sangramento.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med7', deckId: 'cirurgia-1', question: 'Conduta padrão na apendicite com Alvarado alto?', answer: 'Videolaparoscopia', explanation: 'Escore de Alvarado alto indica alta probabilidade de apendicite aguda, conduta é apendicectomia videolaparoscópica.', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med8', deckId: 'cirurgia-1', question: 'Antibiótico isolado na apendicite: por quê evitar?', answer: 'Recorrência alta (~20-40%)', explanation: 'Tratamento antibiótico isolado tem taxa de recorrência significativa, preferir tratamento cirúrgico.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med9', deckId: 'cirurgia-1', question: 'Queimado: indicar intubação se…?', answer: 'Estridor/rouquidão, falha de tosse, queimadura facial/intraoral, pescoço circunferencial, rebaixamento, antes de transporte', explanation: 'Critérios para via aérea definitiva em paciente queimado para prevenir edema e obstrução de via aérea.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med10', deckId: 'cirurgia-1', question: 'DRGE: quando a EDA confirma diagnóstico?', answer: 'Estenose péptica, Barrett, LA B-D', explanation: 'Endoscopia digestiva alta confirma DRGE quando há complicações: estenose péptica, esôfago de Barrett ou esofagite Los Angeles B-D.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med11', deckId: 'cirurgia-1', question: 'Pré-op DRGE: exame obrigatório para prova do refluxo?', answer: 'EDA ou pHmetria', explanation: 'Qualquer exame que comprove o refluxo gastroesofágico antes da cirurgia antirrefluxo.', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med12', deckId: 'cirurgia-1', question: 'Motilidade ineficaz: válvula?', answer: 'Parcial (Toupet/Lind/Pinotti)', explanation: 'Na dismotilidade esofágica, preferir fundoplicatura parcial para evitar disfagia.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med13', deckId: 'cirurgia-1', question: 'Hérnia femoral – limites medial e assoalho?', answer: 'Lacunar (medial) e Cooper/pectíneo (assoalho)', explanation: 'Anatomia do canal femoral: ligamento lacunar medialmente e ligamento de Cooper/pectíneo no assoalho.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med14', deckId: 'cirurgia-1', question: 'Hérnia femoral – tratamento?', answer: 'Cirúrgico em todos', explanation: 'Devido ao alto risco de encarceramento e estrangulamento, toda hérnia femoral deve ser operada.', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med15', deckId: 'cirurgia-1', question: 'Gástrico precoce: definição TNM?', answer: 'T1 (mucosa/submucosa) com ou sem N', explanation: 'Câncer gástrico precoce é definido como T1, limitado à mucosa ou submucosa, independente de metástase linfonodal.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med16', deckId: 'cirurgia-1', question: 'Ressecção endoscópica: precisa cumprir quantos critérios?', answer: 'Todos (mucosa, bem diferenciado, sem LVI, não ulcerado, <2 cm)', explanation: 'Critérios para ressecção endoscópica de câncer gástrico precoce devem ser todos preenchidos.', dueDate: new Date(), stability: 0, difficulty: 5, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med17', deckId: 'cirurgia-1', question: 'RCU eletiva: cirurgia?', answer: 'Proctocolectomia total + IPAA', explanation: 'Retocolite ulcerativa: cirurgia eletiva é proctocolectomia total com reservatório ileal (IPAA - Ileal Pouch-Anal Anastomosis).', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med18', deckId: 'cirurgia-1', question: 'NPT: tríade da realimentação?', answer: 'Hipo-P, hipo-Mg, hipo-K', explanation: 'Síndrome de realimentação na nutrição parenteral total: hipofosfatemia, hipomagnesemia e hipocalemia.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med19', deckId: 'cirurgia-1', question: 'Colelitíase assintomática: duas indicações clássicas de colecistectomia?', answer: 'Cálculo ≥3 cm e vesícula em porcelana', explanation: 'Indicações de colecistectomia profilática em colelitíase assintomática devido ao risco aumentado de câncer.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med20', deckId: 'cirurgia-1', question: 'Cetamina: quando é especialmente útil?', answer: 'Choque (↑PA/FC), broncodilatação', explanation: 'Cetamina aumenta PA e FC, sendo útil em choque, e tem efeito broncodilatador.', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med21', deckId: 'cirurgia-1', question: 'HDB estável: primeiro exame?', answer: 'Colonoscopia com preparo', explanation: 'Hemorragia digestiva baixa estável: investigar com colonoscopia após preparo adequado.', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med22', deckId: 'cirurgia-1', question: 'Obstrução intestinal: marco alta×baixa?', answer: 'Válvula íleo-cecal', explanation: 'Válvula ileocecal delimita obstrução intestinal alta (delgado) de baixa (cólon).', dueDate: new Date(), stability: 0, difficulty: 3, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med23', deckId: 'cirurgia-1', question: 'TEP: quando pedir D-dímero?', answer: 'Probabilidade baixa (Wells <4) para excluir', explanation: 'D-dímero é usado para excluir tromboembolismo pulmonar em pacientes de baixa probabilidade pelo escore de Wells.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
  { id: 'med24', deckId: 'cirurgia-1', question: 'Índice tornozelo-braquial crítico?', answer: '<0,4', explanation: 'ITB <0,4 indica isquemia crítica do membro, necessitando revascularização urgente.', dueDate: new Date(), stability: 0, difficulty: 4, lapses: 0, reps: 0, state: 'NEW' },
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
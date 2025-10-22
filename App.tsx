
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, FunctionCall, Type } from '@google/genai';
import { Card, Deck, Rating, SessionState, TranscriptMessage, StudyGoal, AudioPlaybackState, StudyProgress, VoiceName, ALL_VOICES, OUTPUT_AUDIO_SAMPLE_RATE } from './types';
import { storageService } from './services/storageService';
import { calculateNextReview } from './services/fsrs';
import { geminiService } from './services/geminiService';
import { knowledgeBaseService } from './services/knowledgeBaseService';
import CardView from './components/CardView';
import StatusIndicator from './components/StatusIndicator';
import TranscriptView from './components/TranscriptView';
import DeckListView from './components/DeckListView';
import AudioControls from './components/AudioControls';
import ImportDeckView from './components/ImportDeckView';
import CardStatsView from './components/CardStatsView';
import ToggleSwitch from './components/ToggleSwitch';
import ImageGenerationView from './components/ImageGenerationView';
import ImageAnalysisView from './components/ImageAnalysisView';
import TranscriptionView from './components/TranscriptionView';
import SmartGenerationView from './components/SmartGenerationView';
import TextAnalysisView from './components/TextAnalysisView';


// --- Audio Pipeline ---
// The app uses a single, unified audio queue (`audioQueue`) to manage all sound playback.
// This includes real-time conversational audio from the Gemini Live API and pre-generated
// Text-to-Speech (TTS) audio for reading flashcards.
// This unified approach ensures stable, sequential playback and avoids race conditions.
// The `processAudioQueue` function acts as the consumer for this queue, playing one buffer at a time.
// All audio output is handled at the sample rate defined by OUTPUT_AUDIO_SAMPLE_RATE (24kHz)
// to match the output of the Gemini audio models, ensuring clarity and preventing distortion.
// ---

// Audio Contexts
const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_AUDIO_SAMPLE_RATE });

const App: React.FC = () => {
  // App State
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
  const [previousSessionState, setPreviousSessionState] = useState<SessionState | null>(null);
  const [statusText, setStatusText] = useState("Say 'Start Review' to begin.");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [reviewQueue, setReviewQueue] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);
  const [cardForStats, setCardForStats] = useState<Card | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  
  // Goal State
  const [studyProgressData, setStudyProgressData] = useState<StudyProgress | null>(null); // Persisted daily goal
  const [activeGoal, setActiveGoal] = useState<StudyGoal | null>(null); // Current active goal (session or daily)
  const [sessionProgressCount, setSessionProgressCount] = useState(0); // Cards in this session
  
  // Audio State
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>(AudioPlaybackState.STOPPED);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [isConversationalModeEnabled, setIsConversationalModeEnabled] = useState(false);
  const audioQueue = useRef<AudioBuffer[]>([]).current;
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // AI Explanation State
  const [cardExplanation, setCardExplanation] = useState<string | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  // Image Generation State
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Image Analysis State
  const [imageToAnalyze, setImageToAnalyze] = useState<{url: string, base64: string, mimeType: string} | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Transcription State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Text Analysis State
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [textAnalysisResult, setTextAnalysisResult] = useState<string | null>(null);

  // Gemini Live Session
  const sessionRef = useRef<Awaited<ReturnType<typeof geminiService.connectLive>> | null>(null);

  // Load initial data
  useEffect(() => {
    setDecks(storageService.getDecks());
    const progress = storageService.getStudyProgress();
    setStudyProgressData(progress);
    if (progress) {
      setActiveGoal(progress.goal);
    }
    const savedVoice = storageService.getVoicePreference();
    if (savedVoice) {
      setSelectedVoice(savedVoice);
    }
    setIsConversationalModeEnabled(storageService.getConversationalMode());
  }, []);

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = event.target.value as VoiceName;
    setSelectedVoice(newVoice);
    storageService.setVoicePreference(newVoice);
  };
  
  const handleToggleConversationalMode = (enabled: boolean) => {
    setIsConversationalModeEnabled(enabled);
    storageService.setConversationalMode(enabled);
  };

  const processAudioQueue = useCallback(async () => {
    if (isAssistantSpeaking || audioQueue.length === 0) {
      return;
    }

    setIsAssistantSpeaking(true);
    const audioBuffer = audioQueue.shift();

    if (audioBuffer) {
      // Ensure the AudioContext is running before playing audio.
      // Browsers may suspend it automatically after a period of inactivity.
      if (outputAudioContext.state === 'suspended') {
        await outputAudioContext.resume();
      }

      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      currentAudioSourceRef.current = source;
      setAudioPlaybackState(AudioPlaybackState.PLAYING);
      source.start();

      source.onended = () => {
        currentAudioSourceRef.current = null;
        setIsAssistantSpeaking(false);
        if (audioQueue.length === 0) {
          setAudioPlaybackState(AudioPlaybackState.STOPPED);
        } else {
          processAudioQueue(); // Process next in queue
        }
      };
    } else {
      setIsAssistantSpeaking(false);
        if (audioQueue.length === 0) {
        setAudioPlaybackState(AudioPlaybackState.STOPPED);
      }
    }
  }, [audioQueue, isAssistantSpeaking]);


  const playTts = useCallback(async (text: string) => {
    const base64Audio = await geminiService.generateTts(text, selectedVoice);
    if (base64Audio) {
      try {
        const audioBytes = geminiService.decodeAudio(base64Audio);
        const audioBuffer = await geminiService.decodeAudioData(audioBytes, outputAudioContext, OUTPUT_AUDIO_SAMPLE_RATE, 1);
        audioQueue.push(audioBuffer);
        processAudioQueue();
      } catch (error) {
        console.error("Failed to decode or queue TTS audio:", error);
        setStatusText("Sorry, there was an audio playback error.");
      }
    }
  }, [selectedVoice, audioQueue, processAudioQueue]);


  const handlePauseAudio = useCallback(() => {
    if (outputAudioContext.state === 'running') {
      outputAudioContext.suspend();
      setAudioPlaybackState(AudioPlaybackState.PAUSED);
    }
  }, []);

  const handlePlayAudio = useCallback(() => {
    if (outputAudioContext.state === 'suspended') {
      outputAudioContext.resume();
      setAudioPlaybackState(AudioPlaybackState.PLAYING);
    }
  }, []);

  const handleStopAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.onended = null; // Prevent onended from firing
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
    
    audioQueue.length = 0; // Clear the unified queue

    setIsAssistantSpeaking(false);
    setAudioPlaybackState(AudioPlaybackState.STOPPED);
    
    if (outputAudioContext.state === 'suspended') {
      outputAudioContext.resume();
    }
  }, [audioQueue]);
  

  const handleStartReview = useCallback((deckName: string) => {
    handleGoBack(); // Go back to main view before starting
    setSessionProgressCount(0); // Always reset session progress
    setSessionState(SessionState.PROCESSING);
    setStatusText(`Loading deck: ${deckName}...`);
    const targetDeck = decks.find(d => d.name.toLowerCase() === deckName.toLowerCase());
    if (targetDeck) {
      const dueCards = storageService.getDueCardsForDeck(targetDeck.id);
      if (dueCards.length > 0) {
        setReviewQueue(dueCards);
        setCurrentCard(dueCards[0]);
        setIsCardFlipped(false);
        setSessionState(SessionState.READING_QUESTION);
      } else {
        setSessionState(SessionState.AWAITING_COMMAND);
        setStatusText(`No cards due for review in ${deckName}.`);
        playTts(`No cards due for review in ${deckName}.`);
      }
    } else {
      setSessionState(SessionState.AWAITING_COMMAND);
      setStatusText(`Sorry, I couldn't find a deck named "${deckName}".`);
      playTts(`Sorry, I couldn't find a deck named "${deckName}".`);
    }
  }, [decks, playTts]);

  const handleShowAnswer = useCallback(() => {
    if (sessionState === SessionState.AWAITING_ANSWER_REVEAL) {
      setIsCardFlipped(true);
      setSessionState(SessionState.READING_ANSWER);
    }
  }, [sessionState]);

  const handleRateCard = useCallback((ratingStr: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (sessionState === SessionState.AWAITING_RATING && currentCard) {
      setSessionState(SessionState.PROCESSING);
      const rating = Rating[ratingStr];
      const updatedCard = calculateNextReview(currentCard, rating);
      storageService.updateCard(updatedCard);

      // Update progress counters
      const newSessionProgress = sessionProgressCount + 1;
      setSessionProgressCount(newSessionProgress);

      let goalAchieved = false;
      let goalAchievedText = '';

      // Check session goal
      if (activeGoal?.type === 'session' && newSessionProgress >= activeGoal.target) {
        goalAchieved = true;
        goalAchievedText = `Great job! You've reached your session goal of ${activeGoal.target} cards.`;
      }

      // Update daily goal progress if one exists
      if (studyProgressData) {
        const newDailyProgress = studyProgressData.progress + 1;
        storageService.updateStudyProgress(newDailyProgress);
        setStudyProgressData(prev => prev ? { ...prev, progress: newDailyProgress } : null);
        
        // Check daily goal
        if (activeGoal?.type === 'daily' && newDailyProgress >= activeGoal.target) {
            goalAchieved = true;
            goalAchievedText = `Great job! You've reached your daily goal of ${activeGoal.target} cards.`;
        }
      }
      
      if (goalAchieved) {
        setStatusText(goalAchievedText);
        playTts(goalAchievedText);
      }

      const remainingCards = reviewQueue.slice(1);
      setReviewQueue(remainingCards);

      if (remainingCards.length > 0) {
        setCurrentCard(remainingCards[0]);
        setIsCardFlipped(false);
        setSessionState(SessionState.READING_QUESTION);
      } else {
        setCurrentCard(null);
        setSessionState(SessionState.AWAITING_COMMAND);
        setStatusText("Review complete! Well done.");
        playTts("Review complete! Well done.");
      }
    }
  }, [sessionState, currentCard, reviewQueue, sessionProgressCount, activeGoal, studyProgressData, playTts]);

  const handleSetStudyGoal = useCallback(async (target: number, goalType: 'session' | 'daily') => {
    const newGoal: StudyGoal = { target, type: goalType };
    setActiveGoal(newGoal);
    setSessionProgressCount(0); // Reset session progress for the new goal

    if (goalType === 'daily') {
        const newProgressData = storageService.setStudyGoal(newGoal);
        setStudyProgressData(newProgressData);
    }

    const text = `Ok, I've set your goal to ${target} cards per ${goalType}.`;
    setStatusText(text);
    playTts(text);
  }, [playTts]);

  const handleCreateDeck = useCallback(async (deckName: string) => {
    const newDeck = storageService.createDeck(deckName);
    setDecks(prev => [...prev, newDeck]);
    const text = `I've created the "${deckName}" deck for you.`;
    setStatusText(text);
    playTts(text);
  }, [playTts]);

  const handleDeleteDeck = useCallback(async (deckName: string) => {
    const deckToDelete = decks.find(d => d.name.toLowerCase() === deckName.toLowerCase());
    if (deckToDelete) {
        storageService.deleteDeck(deckToDelete.id);
        setDecks(prev => prev.filter(d => d.id !== deckToDelete.id));
        const text = `Okay, the "${deckName}" deck has been deleted.`;
        setStatusText(text);
        playTts(text);
    } else {
        const text = `Sorry, I couldn't find a deck named "${deckName}".`;
        setStatusText(text);
        playTts(text);
    }
  }, [decks, playTts]);

  const handleListDecks = useCallback(async () => {
    let text;
    if (decks.length > 0) {
        const deckNames = decks.map(d => d.name).join(', ');
        text = `Here are your decks: ${deckNames}.`;
    } else {
        text = "You don't have any decks yet.";
    }
    setStatusText(text);
    playTts(text);
  }, [decks, playTts]);

  const handleShowDecks = useCallback(async () => {
    setSessionState(SessionState.SHOWING_DECKS);
    const text = "Here are your decks. You can select one to start or tell me which one to review.";
    setStatusText("Select a deck to begin a review session.");
    playTts(text);
  }, [playTts]);

  const handleCreateCard = useCallback(async (deckName: string, question: string, answer: string, explanation?: string) => {
    const targetDeck = decks.find(d => d.name.toLowerCase() === deckName.toLowerCase());
    if (targetDeck) {
      storageService.createCard(targetDeck.id, question, answer, explanation);
      const text = `Okay, I've added that card to the "${deckName}" deck.`;
      setStatusText(text);
      playTts(text);
    } else {
      const text = `Sorry, I couldn't find a deck named "${deckName}" to add the card to.`;
      setStatusText(text);
      playTts(text);
    }
  }, [decks, playTts]);

  const findCard = useCallback(async (deckName: string, questionQuery: string): Promise<Card | null> => {
    const targetDeck = decks.find(d => d.name.toLowerCase() === deckName.toLowerCase());
    if (!targetDeck) {
        const text = `Sorry, I couldn't find a deck named "${deckName}".`;
        setStatusText(text);
        playTts(text);
        return null;
    }
    const foundCards = storageService.findCardsByQuestion(targetDeck.id, questionQuery);
    if (foundCards.length > 0) {
        return foundCards[0]; // Return first match
    } else {
        const text = `I couldn't find any card in "${deckName}" with a question containing "${questionQuery}".`;
        setStatusText(text);
        playTts(text);
        return null;
    }
  }, [decks, playTts]);

  const handleFindCardToEdit = useCallback(async (deckName: string, questionQuery: string) => {
    const card = await findCard(deckName, questionQuery);
    if (card) {
        setCardToEdit(card);
        setSessionState(SessionState.EDITING_CARD);
        const text = `I found the card: "${card.question}". What should the new question, answer, or explanation be?`;
        setStatusText("Editing: " + card.question);
        playTts(text);
    }
  }, [findCard, playTts]);

  const handleUpdateCardContent = useCallback(async (updates: { newQuestion?: string; newAnswer?: string; newExplanation?: string }) => {
    if (!cardToEdit || sessionState !== SessionState.EDITING_CARD) {
        const text = "Sorry, you need to find a card to edit first.";
        setStatusText(text);
        playTts(text);
        return;
    }

    const updatedCard: Card = {
        ...cardToEdit,
        question: updates.newQuestion ?? cardToEdit.question,
        answer: updates.newAnswer ?? cardToEdit.answer,
        explanation: updates.newExplanation ?? cardToEdit.explanation,
    };
    storageService.updateCard(updatedCard);

    setCardToEdit(null);
    setSessionState(SessionState.AWAITING_COMMAND);
    
    const text = "I've updated the card.";
    setStatusText(text);
    playTts(text);
  }, [cardToEdit, sessionState, playTts]);

  const handleGoBack = useCallback(() => {
    setCardToEdit(null);
    setCardForStats(null);
    setCardExplanation(null);
    setIsGeneratingExplanation(false);
    setGeneratedImageUrl(null);
    setIsGeneratingImage(false);
    setImageToAnalyze(null);
    setAnalysisResult(null);
    setIsAnalyzingImage(false);
    setIsRecording(false);
    setIsTranscribing(false);
    setTranscriptionResult(null);
    setIsAnalyzingText(false);
    setTextAnalysisResult(null);
    if(mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setPreviousSessionState(null);
    setSessionState(SessionState.AWAITING_COMMAND);
    setStatusText("What would you like to do next?");
  }, []);

  const handleShowImportView = useCallback(async () => {
    setSessionState(SessionState.IMPORTING_DECK);
    const text = "Okay, let's import a new deck. Please choose a file and give the deck a name.";
    setStatusText("Import a deck from a .csv or .txt file.");
    playTts(text);
  }, [playTts]);
  
  const handleShowSmartGenerationView = useCallback(async () => {
    setSessionState(SessionState.SMART_GENERATION);
    const text = "Welcome to the Smart Deck Generator. You can tell me a topic to create a deck from, or upload a document for me to analyze.";
    setStatusText("Create a deck with AI from a topic or document.");
    playTts(text);
  }, [playTts]);

  const handleImportDeck = useCallback(async (deckName: string, csvContent: string) => {
    const newDeck = storageService.importDeckFromCsv(deckName, csvContent);
    setDecks(storageService.getDecks()); // Refresh deck list
    setSessionState(SessionState.AWAITING_COMMAND);
    const text = `Great! The "${newDeck.name}" deck has been imported successfully.`;
    setStatusText(text);
    playTts(text);
  }, [playTts]);
  
  const processAndSaveGeneratedCards = useCallback((deckName: string, generatedCards: {question: string, answer: string, explanation?: string}[]) => {
     if (generatedCards && generatedCards.length > 0) {
      const newDeck = storageService.createDeck(deckName);
      generatedCards.forEach(card => storageService.createCard(newDeck.id, card.question, card.answer, card.explanation));
      setDecks(storageService.getDecks());
      setSessionState(SessionState.AWAITING_COMMAND);
      const successText = `I've created the "${deckName}" deck for you with ${generatedCards.length} cards.`;
      setStatusText(successText);
      playTts(successText);
    } else {
      setSessionState(SessionState.AWAITING_COMMAND);
      const failureText = `Sorry, I had trouble creating the deck about "${deckName}". Please try again.`;
      setStatusText(failureText);
      playTts(failureText);
    }
  }, [playTts]);
  
  const handleGenerateDeckFromForm = useCallback(async (topic: string, depth: string, numCards: number) => {
    let text = `Okay, generating a new "${depth}" level deck about "${topic}" with ${numCards} cards. This might take a moment...`;
    setStatusText(text);
    playTts(text);
    setSessionState(SessionState.PROCESSING);
    
    const generatedCards = await geminiService.generateDeckFromForm(topic, depth, numCards);
    processAndSaveGeneratedCards(topic, generatedCards);
  }, [playTts, processAndSaveGeneratedCards]);

  const handleGenerateDeckFromDocument = useCallback(async (deckName: string, documentText: string) => {
    let text = `Okay, analyzing your document to create the "${deckName}" deck. This may take a few moments...`;
    setStatusText(text);
    playTts(text);
    setSessionState(SessionState.PROCESSING);

    const generatedCards = await geminiService.generateDeckFromDocument(deckName, documentText);
    processAndSaveGeneratedCards(deckName, generatedCards);
  }, [playTts, processAndSaveGeneratedCards]);

  const handleShowCardStats = useCallback(async (deckName: string, questionQuery: string) => {
    setCardExplanation(null);
    setIsGeneratingExplanation(false);
    const card = await findCard(deckName, questionQuery);
    if(card) {
        setCardForStats(card);
        setSessionState(SessionState.SHOWING_CARD_STATS);
        const text = `Here are the stats for the card "${card.question}". You can also ask me to explain this card.`;
        setStatusText(`Viewing stats for: ${card.question}`);
        playTts(text);
    }
  }, [findCard, playTts]);

  const handleExplainCard = useCallback(async () => {
    if (sessionState !== SessionState.SHOWING_CARD_STATS || !cardForStats) {
        const text = "You need to be viewing a card's stats to ask for an explanation.";
        playTts(text);
        return;
    }

    setIsGeneratingExplanation(true);
    setCardExplanation(null);
    const text = `Okay, I'm generating an explanation for "${cardForStats.question}". One moment...`;
    setStatusText("Generating AI explanation...");
    playTts(text);

    const explanation = await geminiService.getCardExplanation(cardForStats);

    setCardExplanation(explanation);
    setIsGeneratingExplanation(false);
    setStatusText("Explanation generated.");
    playTts("The explanation is ready for you to read.");

}, [cardForStats, sessionState, playTts]);

  const handleStartConversation = useCallback(async (query: string) => {
    if (!currentCard) return;

    setPreviousSessionState(sessionState);
    setSessionState(SessionState.CONVERSATION);
    setStatusText("Thinking about your question...");

    const explanation = await geminiService.getExplanation(currentCard, query);

    setTranscripts(prev => [...prev, { source: 'assistant', text: explanation }]);
    playTts(explanation);
  }, [currentCard, sessionState, playTts]);

  const handleGenerateCardsFromWeakness = useCallback(async (deckName: string) => {
    setSessionState(SessionState.PROCESSING);
    let text = `Alright, analyzing your performance in the "${deckName}" deck to find your weak points...`;
    setStatusText(text);
    playTts(text);

    const targetDeck = decks.find(d => d.name.toLowerCase() === deckName.toLowerCase());
    if (!targetDeck) {
        text = `Sorry, I couldn't find a deck named "${deckName}".`;
        setStatusText(text);
        playTts(text);
        setSessionState(SessionState.AWAITING_COMMAND);
        return;
    }
    
    const weakestCard = storageService.getWeakestCard(targetDeck.id);
    if (!weakestCard || weakestCard.lapses === 0) {
        text = `You don't seem to have any weak points in "${deckName}" right now. Great job!`;
        setStatusText(text);
        playTts(text);
        setSessionState(SessionState.SHOWING_DECKS); // Go back to the deck list
        return;
    }
    
    text = `It looks like you're struggling with: "${weakestCard.question}". I'll consult my knowledge base to create some new cards to help you practice.`;
    setStatusText("Found weak point, generating new cards...");
    playTts(text);
    
    const contextQuery = `${weakestCard.question} ${weakestCard.answer}`;
    const context = knowledgeBaseService.findRelevantChunk(contextQuery);

    if (!context) {
      text = `I couldn't find specific information on that topic in my knowledge base, but I'll try to create some cards anyway.`;
      playTts(text);
    }
    
    const newCards = await geminiService.generateTargetedCards(weakestCard, context, 3);
    
    if (newCards.length > 0) {
        newCards.forEach(card => storageService.createCard(targetDeck.id, card.question, card.answer, card.explanation));
        text = `I've added ${newCards.length} new cards to the "${deckName}" deck to help you master this topic.`;
        setStatusText(text);
        playTts(text);
    } else {
        text = `I had some trouble generating new cards for that topic. Please try again later.`;
        setStatusText(text);
        playTts(text);
    }
    setSessionState(SessionState.SHOWING_DECKS); // Go back to the deck list
  }, [decks, playTts]);

   const handleShowImageGenerationView = useCallback(() => {
    setSessionState(SessionState.GENERATING_IMAGE);
    setStatusText('Enter a prompt to generate an image.');
    playTts('What kind of image would you like me to create?');
  }, [playTts]);

  const handleGenerateImage = useCallback(async (prompt: string) => {
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setStatusText(`Generating an image of "${prompt}"...`);
    playTts(`Okay, generating an image of ${prompt}. This might take a moment.`);

    const imageUrl = await geminiService.generateImage(prompt);
    if (imageUrl) {
      setGeneratedImageUrl(imageUrl);
      setStatusText('Image generated successfully.');
      playTts('Here is the image you requested.');
    } else {
      setStatusText('Sorry, I failed to generate the image.');
      playTts('Sorry, I had a problem generating that image. Please try again.');
    }
    setIsGeneratingImage(false);
  }, [playTts]);
  
  const handleShowImageAnalysisView = useCallback(() => {
    setSessionState(SessionState.ANALYZING_IMAGE);
    setStatusText('Upload an image to analyze.');
    playTts('Please upload an image, and let me know what you want to know about it.');
  }, [playTts]);

  const handleAnalyzeImage = useCallback(async (prompt: string) => {
    if (!imageToAnalyze) {
      playTts('Please upload an image first.');
      return;
    }
    setIsAnalyzingImage(true);
    setAnalysisResult(null);
    setStatusText('Analyzing image...');
    playTts('Okay, analyzing the image. One moment.');

    const result = await geminiService.analyzeImage(prompt, imageToAnalyze.base64, imageToAnalyze.mimeType);
    
    setAnalysisResult(result);
    setStatusText('Image analysis complete.');
    playTts('Here is the analysis of the image.');

    setIsAnalyzingImage(false);
  }, [imageToAnalyze, playTts]);

  const handleShowTranscriptionView = useCallback(() => {
    setSessionState(SessionState.TRANSCRIBING_AUDIO);
    setStatusText('Ready to transcribe audio.');
    setTranscriptionResult(null);
    playTts('I\'m ready to transcribe. Press the record button to start.');
  }, [playTts]);

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          setStatusText('Transcribing audio...');
          const result = await geminiService.transcribeAudio(base64Audio, 'audio/webm');
          setTranscriptionResult(result);
          setIsTranscribing(false);
          setStatusText('Transcription complete.');
        };
        stream.getTracks().forEach(track => track.stop()); // Stop mic access
      };

      recorder.start();
      setIsRecording(true);
      setStatusText('Recording...');
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatusText('Could not start recording. Please check microphone permissions.');
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleShowTextAnalysisView = useCallback(() => {
    setSessionState(SessionState.ANALYZING_TEXT);
    setStatusText('Enter some text to analyze.');
    playTts('Please provide the text you want me to analyze, and tell me what you want to know.');
  }, [playTts]);

  const handleAnalyzeText = useCallback(async (text: string, prompt: string, complexity: 'simple' | 'complex') => {
    setIsAnalyzingText(true);
    setTextAnalysisResult(null);
    setStatusText('Analyzing text...');
    playTts(`Okay, analyzing the text using the ${complexity} model. One moment.`);

    const result = await geminiService.analyzeText(text, prompt, complexity);
    
    setTextAnalysisResult(result);
    setStatusText('Text analysis complete.');
    playTts('Here is the analysis.');

    setIsAnalyzingText(false);
  }, [playTts]);


  const processToolCall = useCallback((fc: FunctionCall) => {
    const { name, args } = fc;
    console.log(`Tool call: ${name}`, args);
    switch (name) {
      case 'startReview': handleStartReview(args.deckName as string); break;
      case 'showAnswer': handleShowAnswer(); break;
      case 'rateCard': handleRateCard(args.rating as 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'); break;
      case 'startConversation': handleStartConversation(args.query as string); break;
      case 'setStudyGoal': handleSetStudyGoal(args.target as number, args.goalType as 'session' | 'daily'); break;
      case 'createDeck': handleCreateDeck(args.deckName as string); break;
      case 'deleteDeck': handleDeleteDeck(args.deckName as string); break;
      case 'listDecks': handleListDecks(); break;
      case 'showDecks': handleShowDecks(); break;
      case 'createCard': handleCreateCard(args.deckName as string, args.question as string, args.answer as string, args.explanation as string | undefined); break;
      case 'findCardToEdit': handleFindCardToEdit(args.deckName as string, args.questionQuery as string); break;
      case 'updateCardContent': handleUpdateCardContent({ newQuestion: args.newQuestion as string | undefined, newAnswer: args.newAnswer as string | undefined, newExplanation: args.newExplanation as string | undefined }); break;
      case 'goBack': handleGoBack(); break;
      case 'showImportView': handleShowImportView(); break;
      case 'showSmartGenerationView': handleShowSmartGenerationView(); break;
      case 'generateDeckFromForm': handleGenerateDeckFromForm(args.topic as string, args.depth as string, args.numberOfCards as number); break;
      case 'generateDeckFromDocument': handleGenerateDeckFromDocument(args.deckName as string, args.documentText as string); break;
      case 'showCardStats': handleShowCardStats(args.deckName as string, args.questionQuery as string); break;
      case 'explainCard': handleExplainCard(); break;
      case 'generateCardsFromWeakness': handleGenerateCardsFromWeakness(args.deckName as string); break;
      case 'showImageGenerationView': handleShowImageGenerationView(); break;
      case 'generateImage': handleGenerateImage(args.prompt as string); break;
      case 'showImageAnalysisView': handleShowImageAnalysisView(); break;
      case 'showTranscriptionView': handleShowTranscriptionView(); break;
      case 'showTextAnalysisView': handleShowTextAnalysisView(); break;
      default: console.warn(`Unknown tool call: ${name}`);
    }
    sessionRef.current?.sendToolResponse({
      functionResponses: { id: fc.id, name: fc.name, response: { result: 'OK' } }
    });
  }, [handleStartReview, handleShowAnswer, handleRateCard, handleStartConversation, handleSetStudyGoal, handleCreateDeck, handleDeleteDeck, handleListDecks, handleShowDecks, handleCreateCard, handleFindCardToEdit, handleUpdateCardContent, handleGoBack, handleShowImportView, handleShowSmartGenerationView, handleGenerateDeckFromForm, handleGenerateDeckFromDocument, handleShowCardStats, handleExplainCard, handleGenerateCardsFromWeakness, handleShowImageGenerationView, handleGenerateImage, handleShowImageAnalysisView, handleShowTranscriptionView, handleShowTextAnalysisView]);

  const handleLiveMessage = useCallback(async (message: LiveServerMessage) => {
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      if(text) {
          setTranscripts(prev => {
              const last = prev[prev.length - 1];
              if (last && last.source === 'user') {
                  const newLast = { ...last, text: last.text + text };
                  return [...prev.slice(0, -1), newLast];
              }
              return [...prev, { source: 'user', text }];
          });
      }
    }
    
    if (message.toolCall) {
        message.toolCall.functionCalls.forEach(processToolCall);
    }
    
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
        try {
            const audioBytes = geminiService.decodeAudio(audioData);
            const audioBuffer = await geminiService.decodeAudioData(audioBytes, outputAudioContext, OUTPUT_AUDIO_SAMPLE_RATE, 1);
            audioQueue.push(audioBuffer);
            processAudioQueue();
        } catch (error) {
            console.error("Failed to decode or queue assistant audio:", error);
            setStatusText("Sorry, there was an audio playback error.");
        }
    }
  }, [processToolCall, audioQueue, processAudioQueue]);


  // Main state machine effect
  useEffect(() => {
    const manageState = async () => {
      switch (sessionState) {
        case SessionState.READING_QUESTION:
          if (currentCard) {
            setStatusText("Reading question...");
            playTts(currentCard.question);
            setSessionState(SessionState.AWAITING_ANSWER_REVEAL);
            setStatusText("Say 'Show Answer' when ready.");
          }
          break;
        case SessionState.READING_ANSWER:
          if (currentCard) {
            setStatusText("Reading answer...");
            const fullText = `${currentCard.answer}. How did you do? Say Again, Hard, Good, or Easy.`;
            playTts(fullText);
            setSessionState(SessionState.AWAITING_RATING);
            setStatusText("Rate your answer: Again, Hard, Good, or Easy.");
          }
          break;
      }
    };
    manageState();
  }, [sessionState, currentCard, playTts]);

  // Effect to return from conversation state after TTS finishes
  useEffect(() => {
    if (audioPlaybackState === AudioPlaybackState.STOPPED && sessionState === SessionState.CONVERSATION && previousSessionState) {
      setSessionState(previousSessionState);
      const statusMap: Record<string, string> = {
          [SessionState.AWAITING_RATING]: "Okay, let's continue. How did you do on the card?",
          [SessionState.AWAITING_ANSWER_REVEAL]: "Alright, back to it. Say 'Show Answer' when you're ready.",
          [SessionState.AWAITING_COMMAND]: "Hope that helped! What's next?",
      }
      setStatusText(statusMap[previousSessionState] || "Let's continue.");
      setPreviousSessionState(null);
    }
  }, [audioPlaybackState, sessionState, previousSessionState]);


  const startSession = useCallback(async () => {
    try {
      if(sessionRef.current) return;
      setTranscripts([]);
      const session = await geminiService.connectLive(
        handleLiveMessage,
        (e) => { console.error(e); setSessionState(SessionState.ERROR); setStatusText("Connection error."); },
        () => { console.log('closed'); setSessionState(SessionState.IDLE); setStatusText("Session ended."); },
        selectedVoice,
        isConversationalModeEnabled
      );
      sessionRef.current = session;
      setSessionState(SessionState.AWAITING_COMMAND);
    } catch (e) {
      console.error(e);
      setSessionState(SessionState.ERROR);
      setStatusText("Failed to start session. Check API key and permissions.");
    }
  }, [handleLiveMessage, selectedVoice, isConversationalModeEnabled]);

  const renderContent = () => {
    switch(sessionState) {
      case SessionState.SHOWING_DECKS:
        return <DeckListView decks={decks} onStartReview={handleStartReview} onShowImport={handleShowImportView} onShowSmartGeneration={handleShowSmartGenerationView} onStrengthenWeakness={handleGenerateCardsFromWeakness} onShowImageGeneration={handleShowImageGenerationView} onShowImageAnalysis={handleShowImageAnalysisView} onShowTranscription={handleShowTranscriptionView} onShowTextAnalysis={handleShowTextAnalysisView} />;
      case SessionState.IMPORTING_DECK:
        return <ImportDeckView onImport={handleImportDeck} onCancel={handleGoBack} />;
      case SessionState.SMART_GENERATION:
        return <SmartGenerationView onGenerateFromForm={handleGenerateDeckFromForm} onGenerateFromDocument={handleGenerateDeckFromDocument} onCancel={handleGoBack} />;
      case SessionState.SHOWING_CARD_STATS:
        return <CardStatsView 
          card={cardForStats} 
          onBack={handleGoBack}
          explanation={cardExplanation}
          isGenerating={isGeneratingExplanation}
          onGenerateExplanation={handleExplainCard} 
        />;
      case SessionState.GENERATING_IMAGE:
        return <ImageGenerationView onGenerate={handleGenerateImage} onBack={handleGoBack} isGenerating={isGeneratingImage} imageUrl={generatedImageUrl} />;
      case SessionState.ANALYZING_IMAGE:
        return <ImageAnalysisView onAnalyze={handleAnalyzeImage} onBack={handleGoBack} isAnalyzing={isAnalyzingImage} analysisResult={analysisResult} image={imageToAnalyze} setImage={setImageToAnalyze} />;
      case SessionState.TRANSCRIBING_AUDIO:
        return <TranscriptionView onStartRecording={handleStartRecording} onStopRecording={handleStopRecording} onBack={handleGoBack} isRecording={isRecording} isTranscribing={isTranscribing} transcriptionResult={transcriptionResult} />;
      case SessionState.ANALYZING_TEXT:
        return <TextAnalysisView onAnalyze={handleAnalyzeText} onBack={handleGoBack} isAnalyzing={isAnalyzingText} analysisResult={textAnalysisResult} />;
      default:
        const displayCard = cardToEdit ?? currentCard;
        return <CardView 
          card={displayCard} 
          isFlipped={isCardFlipped}
          isEditing={sessionState === SessionState.EDITING_CARD} 
        />
    }
  };

  const renderGoalProgress = () => {
    if (!activeGoal || sessionState === SessionState.IDLE || [SessionState.EDITING_CARD, SessionState.SHOWING_DECKS, SessionState.IMPORTING_DECK, SessionState.SHOWING_CARD_STATS, SessionState.GENERATING_IMAGE, SessionState.ANALYZING_IMAGE, SessionState.TRANSCRIBING_AUDIO, SessionState.SMART_GENERATION, SessionState.ANALYZING_TEXT].includes(sessionState)) {
      return null;
    }

    const progress = activeGoal.type === 'session' 
      ? sessionProgressCount 
      : (studyProgressData?.progress ?? 0);
    
    const goalTypeDisplay = activeGoal.type.charAt(0).toUpperCase() + activeGoal.type.slice(1);

    return (
      <div className="text-lg text-cyan-400 bg-gray-800/50 px-4 py-2 rounded-md">
        {goalTypeDisplay} Goal: {progress} / {activeGoal.target} cards
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 space-y-6 font-sans">
      <div className="w-full max-w-2xl flex justify-center items-start relative">
        <div className="text-center">
          <h1 className="text-5xl font-bold">EchoCards</h1>
          <p className="text-gray-400 mt-2">Your voice-powered study partner</p>
        </div>
        <div className="absolute top-0 right-0">
          <label htmlFor="voice-select" className="sr-only">Assistant Voice</label>
          <select
            id="voice-select"
            value={selectedVoice}
            onChange={handleVoiceChange}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Select assistant voice"
          >
            {ALL_VOICES.map(voice => (
              <option key={voice} value={voice}>{voice}</option>
            ))}
          </select>
        </div>
      </div>

      {renderGoalProgress()}

      {renderContent()}

      <StatusIndicator status={statusText} isAssistantSpeaking={isAssistantSpeaking} />
      
      {sessionState !== SessionState.IDLE && (
        <AudioControls 
          playbackState={audioPlaybackState}
          onPlay={handlePlayAudio}
          onPause={handlePauseAudio}
          onStop={handleStopAudio}
        />
      )}

      {sessionState !== SessionState.IDLE && (
         <TranscriptView messages={transcripts} />
      )}

      {sessionState === SessionState.IDLE && (
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <ToggleSwitch
              id="conversational-mode"
              label="Enable Conversational Learning"
              checked={isConversationalModeEnabled}
              onChange={handleToggleConversationalMode}
            />
            <p className="text-xs text-gray-500 max-w-xs text-center">
              Allows you to interrupt a review to ask questions about the current card.
            </p>
          </div>
          <button onClick={startSession} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
            Start Session
          </button>
        </div>
      )}
    </div>
  );
};

export default App;

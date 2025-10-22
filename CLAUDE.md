# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EchoCards is a voice-powered flashcard application that uses Google's Gemini AI models for conversational learning. Users interact with the app primarily through voice commands to study flashcards, create decks, and get AI-powered explanations.

## Development Commands

### Running the Application
```bash
npm install              # Install dependencies
npm run dev             # Start development server on port 3000
npm run build           # Build for production
npm run preview         # Preview production build
```

### Environment Setup
Create a `.env.local` file in the project root with:
```
GEMINI_API_KEY=your_api_key_here
```

The Vite config exposes this as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` to the application.

## Architecture Overview

### State Machine Pattern
The application uses a centralized state machine managed in `App.tsx` via the `SessionState` enum (defined in `types.ts`). Key states include:
- `IDLE`: Before session starts
- `AWAITING_COMMAND`: Listening for voice commands
- `READING_QUESTION` / `AWAITING_ANSWER_REVEAL` / `READING_ANSWER` / `AWAITING_RATING`: Review flow states
- `CONVERSATION`: Paused for Q&A about current card
- `SHOWING_DECKS`, `IMPORTING_DECK`, `EDITING_CARD`, etc.: UI mode states

State transitions are handled through callbacks that update `sessionState`, which drives UI rendering and behavior.

### Audio Pipeline Architecture
The app uses a **unified audio queue** pattern (`audioQueue` ref in App.tsx):
- Single queue handles both Gemini Live API audio (conversational) and generated TTS audio
- `processAudioQueue()` function sequentially plays audio buffers
- All audio operates at `OUTPUT_AUDIO_SAMPLE_RATE` (24kHz) to match Gemini's output
- `AudioContext` manages playback with pause/resume/stop controls
- Audio sources are PCM16 format, decoded via `geminiService.decodeAudioData()`

This design prevents race conditions and ensures stable sequential playback.

### Services Layer

#### `services/geminiService.ts`
Central integration point for Google Gemini API:
- **Gemini Live API**: Establishes WebSocket connection for real-time voice interaction
- **Function Declarations**: Defines tools the AI can call (startReview, rateCard, createDeck, etc.)
- **TTS Generation**: Uses Gemini models to generate speech from text
- **Content Generation**: Deck generation from topics/documents, card explanations, targeted practice cards
- **Multimodal Features**: Image generation/analysis, audio transcription, text analysis
- Audio encoding/decoding utilities (base64, PCM16)

The Live API connection (`connectLive()`) returns a session object that handles bidirectional communication, tool calls, and audio streaming.

#### `services/storageService.ts`
All data persistence via localStorage:
- Manages decks and cards with seed data initialization
- Serializes/deserializes card dates
- Provides CRUD operations for decks and cards
- Study progress tracking (daily goals with date-based reset)
- User preferences (voice selection, conversational mode)
- CSV import functionality

#### `services/fsrs.ts`
Implements FSRS-4.5 (Free Spaced Repetition Scheduler) algorithm:
- Calculates next review dates based on card performance
- Tracks stability, difficulty, lapses, and repetitions
- Uses scientifically-tuned weights (W array) for scheduling
- Manages card states: NEW → LEARNING → REVIEW (or RELEARNING on lapses)

#### `services/knowledgeBaseService.ts`
Simple knowledge base for targeted card generation:
- Stores topic chunks in memory
- Finds relevant context via keyword matching
- Used when generating cards from user's weak points

### Component Architecture
Components are organized by function:
- **View Components**: `CardView`, `DeckListView`, `CardStatsView`, `ImportDeckView`, etc. - each corresponds to a SessionState
- **Control Components**: `AudioControls`, `StatusIndicator`, `TranscriptView` - shared across states
- **Input Components**: `ToggleSwitch` - reusable UI elements

Most components are controlled (stateless), receiving props from App.tsx and invoking callbacks for state changes.

### Tool Call Processing
When the Gemini Live API invokes a function (e.g., user says "start review of world capitals"):
1. `handleLiveMessage()` receives tool call from WebSocket
2. `processToolCall()` dispatches to appropriate handler based on function name
3. Handler updates app state and calls `playTts()` for audio response
4. Tool response sent back to AI: `session.sendToolResponse()`

This pattern enables natural voice control without explicit command parsing.

## Key Technical Details

### Type Definitions (types.ts)
- `Card`: Flashcard with FSRS scheduling properties
- `Deck`: Container for cards
- `SessionState`: Application state enum
- `StudyGoal` / `StudyProgress`: Goal tracking types
- `AudioPlaybackState`: Audio control states
- `VoiceName`: Available Gemini voices

### Conversational Learning Mode
When enabled (`isConversationalModeEnabled`):
- User can interrupt reviews to ask questions about the current card
- `handleStartConversation()` pauses review (saves `previousSessionState`)
- AI generates explanation via `geminiService.getExplanation()`
- After TTS finishes, automatically returns to previous state
- Transcript view shows conversation history

### Smart Deck Generation
Two approaches:
1. **From Form**: User specifies topic, depth level, and card count
2. **From Document**: Parses uploaded text/CSV and generates relevant cards

Both use `geminiService.generateDeck*()` methods which prompt Gemini models to create structured card data.

### Weakness-Based Practice
`handleGenerateCardsFromWeakness()`:
1. Finds card with most lapses in target deck
2. Queries knowledge base for related context
3. Generates 3 new targeted cards via `geminiService.generateTargetedCards()`
4. Adds cards to same deck for focused practice

This adaptively addresses user's weak points.

## Code Patterns and Conventions

### State Updates
Always use functional updates when state depends on previous value:
```typescript
setDecks(prev => [...prev, newDeck]);
```

### Audio Queue Management
To add audio to playback:
```typescript
audioQueue.push(audioBuffer);
processAudioQueue();
```
Never manipulate queue during playback - let `processAudioQueue()` handle sequencing.

### Date Handling
Cards use `Date` objects in memory but serialize to ISO strings in localStorage. Always convert when reading/writing:
```typescript
dueDate: new Date(card.dueDate)  // when loading
dueDate: card.dueDate.toISOString()  // when saving
```

### Tool Call Handler Pattern
Each user-facing feature should have a handler function that:
1. Updates app state
2. Calls service layer for business logic
3. Provides audio feedback via `playTts()`
4. Updates status text

## Common Pitfalls

1. **Audio Context State**: Browser may suspend AudioContext automatically. Always check and resume before playback.
2. **LocalStorage Dates**: Don't forget to parse ISO strings back to Date objects when loading cards.
3. **State Machine Conflicts**: Ensure state transitions are intentional - multiple states trying to render the same component can cause issues.
4. **API Key Exposure**: Never commit `.env.local` file. The Vite config handles environment variable injection.
5. **Tool Response**: Always send tool response back to Gemini after handling a function call, or the AI will hang waiting.

## Adding New Features

### New Voice Command
1. Add function declaration to `controlFunctions` array in `geminiService.ts`
2. Create handler function in `App.tsx` following the tool call pattern
3. Add case to `processToolCall()` switch statement
4. Test via voice input after starting a session

### New View/Mode
1. Add state to `SessionState` enum in `types.ts`
2. Create React component for the view in `components/`
3. Add case to `renderContent()` switch in `App.tsx`
4. Create handler to transition to new state
5. Optionally add tool call if voice-activated

### New Service Function
1. Add method to appropriate service (e.g., `geminiService`)
2. Use `getAi()` to access initialized GoogleGenAI instance
3. Handle errors gracefully - audio feedback is key for voice UI
4. Consider caching or memoization for expensive operations

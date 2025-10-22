# Gemini API Configuration & Capabilities

This document covers the advanced configuration options and capabilities of the Gemini API integration in EchoCards.

## Table of Contents
1. [Ephemeral Token Configuration](#ephemeral-token-configuration)
2. [Function Calling & Tools](#function-calling--tools)
3. [API Versions](#api-versions)
4. [Best Practices](#best-practices)

---

## Ephemeral Token Configuration

### What are Ephemeral Tokens?

Ephemeral tokens are **short-lived authentication tokens** that can be used instead of permanent API keys for Live API sessions. They provide enhanced security for production deployments.

### Current Configuration

**Your current setup (geminiService.ts:51):**
```typescript
ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
```

This uses a **permanent API key**, which is simpler but less secure for production.

### Enabling Ephemeral Tokens

To use ephemeral tokens, you need to:

#### 1. Update the GoogleGenAI Initialization

```typescript
// services/geminiService.ts
const getAi = () => {
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.API_KEY as string,
      httpOptions: {
        apiVersion: 'v1alpha'  // Required for ephemeral tokens
      }
    });
  }
  return ai;
};
```

#### 2. Create Ephemeral Tokens

```typescript
// Example: Generate ephemeral token before connecting
const createEphemeralToken = async () => {
  const ai = getAi();

  // Create a short-lived token (e.g., 1 hour)
  const token = await ai.auth.createEphemeralToken({
    ttl: 3600  // Time to live in seconds
  });

  return token;
};

// Use it for Live session
const connectWithEphemeralToken = async () => {
  const token = await createEphemeralToken();

  const aiWithToken = new GoogleGenAI({
    apiKey: token.name,  // Use token instead of permanent key
    httpOptions: { apiVersion: 'v1alpha' }
  });

  const session = await aiWithToken.live.connect({
    // ... your config
  });

  return session;
};
```

#### 3. Considerations

**Pros:**
- ✅ Enhanced security (tokens expire)
- ✅ Better for production (limit exposure)
- ✅ Can revoke without changing API key
- ✅ Fine-grained access control

**Cons:**
- ❌ More complex implementation
- ❌ Requires token refresh logic
- ❌ Only works with v1alpha API
- ❌ Experimental feature (may change)

**Recommendation for EchoCards:**
- **Development**: Use permanent API key (current setup is fine)
- **Production**: Implement ephemeral tokens with refresh logic

### Security Warning from SDK

If you use ephemeral tokens without v1alpha, you'll see:
```
Warning: The SDK's ephemeral token support is in v1alpha only.
Please use const ai = new GoogleGenAI({
  apiKey: token.name,
  httpOptions: { apiVersion: 'v1alpha' }
}); before session connection.
```

---

## Function Calling & Tools

### Overview

**YES! Your model extensively uses functions and tools!** 🎉

EchoCards implements **25 custom functions** that the Gemini model can call to control the application via voice commands.

### Architecture

```
User Voice Input → WebSocket → Gemini Live API
                                      ↓
                          Analyzes Intent & Calls Function
                                      ↓
                    Returns FunctionCall in LiveServerMessage
                                      ↓
                              App.tsx Handles Call
                                      ↓
                           Executes Action (e.g., flip card)
                                      ↓
                          Sends TTS Response to User
```

### Complete Function List (25 Total)

#### **1. Review Session Control (4 functions)**
```typescript
startReview(deckName: string)          // "Start reviewing World Capitals"
showAnswer()                            // "Show me the answer"
rateCard(rating: 'AGAIN'|'HARD'|'GOOD'|'EASY')  // "That was easy"
startConversation(query: string)        // "Why is that?" / "Explain more"
```

#### **2. Deck Management (7 functions)**
```typescript
createDeck(deckName: string)           // "Create a deck called Physics"
deleteDeck(deckName: string)           // "Delete the Capitals deck"
listDecks()                            // "What decks do I have?"
showDecks()                            // "Show all my decks"
showImportView()                       // "I want to import a deck"
generateDeckFromForm(topic, depth, numberOfCards)  // "Create 10 beginner cards about Python"
generateDeckFromDocument(deckName, documentText)   // "Make flashcards from this text"
```

#### **3. Card Management (5 functions)**
```typescript
createCard(deckId, question, answer)   // "Add a new card to Biology"
findCardToEdit(deckId, query)          // "Find the card about mitochondria"
updateCardContent(cardId, question, answer)  // "Change that card"
showCardStats(cardId)                  // "Show stats for this card"
explainCard(cardId)                    // "Explain this card in detail"
```

#### **4. AI Features (5 functions)**
```typescript
generateImage(prompt)                  // "Generate an image of a neuron"
showImageGenerationView()              // "I want to create an image"
showImageAnalysisView()                // "Let me upload a photo"
showTranscriptionView()                // "I want to record audio"
showTextAnalysisView()                 // "Analyze some text for me"
```

#### **5. Study Goals & Analytics (2 functions)**
```typescript
setStudyGoal(target, goalType)         // "Set a goal of 20 cards daily"
generateCardsFromWeakness(deckId)      // "Help me with my weak areas"
```

#### **6. Navigation (2 functions)**
```typescript
showSmartGenerationView()              // "Open the deck generator"
goBack()                               // "Go back" / "Cancel"
```

### How Functions Are Configured

**Declaration (services/geminiService.ts:58-250+):**
```typescript
const controlFunctions: FunctionDeclaration[] = [
  {
    name: 'startReview',
    description: "Starts a flashcard review session for a given deck.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        deckName: {
          type: Type.STRING,
          description: 'The name of the deck to review, e.g., "World Capitals".'
        },
      },
      required: ['deckName'],
    },
  },
  // ... 24 more functions
];
```

**Registration (services/geminiService.ts:359):**
```typescript
const sessionPromise = ai.live.connect({
  config: {
    tools: [{ functionDeclarations: controlFunctions }],
    // ... other config
  }
});
```

### Function Call Flow

**1. User speaks:** "Start reviewing World Capitals"

**2. Gemini analyzes intent and returns:**
```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [{
        "functionCall": {
          "name": "startReview",
          "args": {
            "deckName": "World Capitals"
          }
        }
      }]
    }
  }
}
```

**3. App.tsx handles the function call (App.tsx:859-870):**
```typescript
// Extract function call from message
const functionCall = message.serverContent?.modelTurn?.parts?.[0]?.functionCall;

if (functionCall) {
  switch (functionCall.name) {
    case 'startReview':
      handleStartReview(functionCall.args.deckName);
      break;
    case 'showAnswer':
      handleShowAnswer();
      break;
    // ... handle all 25 functions
  }
}
```

**4. System responds:** "Let's review World Capitals! Here's your first card..."

### Advanced Function Features

#### **Type Safety**
All functions use TypeScript enums for constrained values:
```typescript
rateCard(rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY')
setStudyGoal(goalType: 'session' | 'daily')
generateDeckFromForm(depth: 'Beginner' | 'Intermediate' | 'Expert')
```

#### **Optional Parameters**
Some functions have optional explanation fields:
```typescript
createCard(deckId: string, question: string, answer: string, explanation?: string)
```

#### **Complex Objects**
Functions can accept structured data:
```typescript
generateDeckFromForm({
  topic: "Quantum Physics",
  depth: "Expert",
  numberOfCards: 15
})
```

### Function Calling Best Practices

**System Instructions (services/geminiService.ts:234-310):**
The model is instructed on when and how to use each function:

```
When the user says "start review" or mentions starting a deck:
→ Use the 'startReview' function

When user wants to rate a card ("that was easy", "I got it wrong"):
→ Use the 'rateCard' function with appropriate rating

When user asks a question about the current card:
→ Use the 'startConversation' function
```

---

## API Versions

### v1alpha (Alpha)
- **Ephemeral tokens** ✅
- **Latest features** ✅
- **May change** ⚠️
- **Experimental** ⚠️

### v1 (Stable) - Currently Used
- **Permanent API keys** ✅
- **Stable interface** ✅
- **Production ready** ✅
- **No ephemeral tokens** ❌

### Choosing a Version

**Use v1alpha if:**
- You need ephemeral tokens
- You want cutting-edge features
- You can handle API changes

**Use v1 if:** (Current choice)
- You want stability
- Permanent API keys are acceptable
- Production reliability is critical

---

## Best Practices

### 1. API Key Security
```typescript
// ❌ BAD: Hardcoded API key
const ai = new GoogleGenAI({ apiKey: "AIza..." });

// ✅ GOOD: Environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ✅ BETTER: Ephemeral token for production
const token = await ai.auth.createEphemeralToken({ ttl: 3600 });
const ai = new GoogleGenAI({ apiKey: token.name });
```

### 2. Function Naming
```typescript
// ❌ BAD: Vague name
{ name: 'doThing', description: 'Does something' }

// ✅ GOOD: Clear, specific name
{ name: 'startReview', description: 'Starts a flashcard review session' }
```

### 3. Error Handling
```typescript
// Handle function call errors gracefully
try {
  const result = await handleFunctionCall(functionCall);
} catch (error) {
  console.error('Function call failed:', error);
  playTts("Sorry, I couldn't complete that action. Please try again.");
}
```

### 4. Function Descriptions
Write clear descriptions that help the model understand when to call the function:

```typescript
{
  name: 'generateDeckFromDocument',
  description: "Analyzes text from an uploaded document and creates a deck of flashcards based on the key themes found. Use this when the user provides or uploads text content and wants to convert it into study cards.",
  // ...
}
```

---

## Summary

### Current EchoCards Setup

✅ **Function Calling**: Extensively used (25 functions)
✅ **Tools**: Properly configured via `tools` parameter
✅ **API Version**: v1 (stable)
✅ **Authentication**: Permanent API key
⚠️ **Ephemeral Tokens**: Not configured (optional enhancement)

### Recommendations

1. **Keep current setup for development** - It works well!
2. **Consider ephemeral tokens for production** - Enhanced security
3. **Monitor API version changes** - Stay updated with v1alpha features
4. **Add more functions as needed** - Framework is extensible

### Next Steps (Optional)

If you want to implement ephemeral tokens:
1. Update `getAi()` to use `v1alpha`
2. Implement token creation/refresh logic
3. Handle token expiration gracefully
4. Test thoroughly in staging environment

---

**Questions or issues?** Check the [Google GenAI SDK documentation](https://ai.google.dev/api/node) for the latest updates.

# Deck Creation Guide for EchoCards

## 1. Anki Deck Support

**Current Status**: ❌ Native Anki (.apkg) format is NOT supported

**Workaround**: ✅ Export Anki decks to CSV, then import

### How to Export from Anki:
1. Open Anki
2. Select your deck
3. Go to File → Export
4. Choose "Notes in Plain Text (.txt)" or CSV
5. Make sure to include all fields
6. Format should be: `Question,Answer,Explanation` (one per line)

### CSV Format Expected:
```csv
What is the capital of France?,Paris,Paris has been the capital since 987 AD
What is 2+2?,4,Basic arithmetic
```

## 2. Available Methods to Create Your Own Decks

### Method 1: Voice Command - Manual Creation ✅
**How**: Say to the AI assistant
```
"Create a deck called [Deck Name]"
"Create a card in [Deck Name] with question [Question] and answer [Answer]"
```

**Example**:
- "Create a deck called Spanish Vocabulary"
- "Create a card in Spanish Vocabulary: question 'What is hello in Spanish?' answer 'Hola'"

**Pros**: Quick for a few cards
**Cons**: Tedious for many cards

---

### Method 2: Smart Generation from Topic ⭐ BEST FOR NEW CONTENT
**How**:
1. Say "Show smart generation" or "Create a deck with AI"
2. The app opens the Smart Deck Generator
3. Fill in the form:
   - Topic (e.g., "Ancient Rome", "Python Programming")
   - Difficulty level (Beginner, Intermediate, Advanced)
   - Number of cards (5-50)

**Example Topics**:
- "World War II Major Events"
- "React Hooks"
- "Human Anatomy - Nervous System"
- "German A1 Vocabulary"

**Pros**: Fastest way, AI generates high-quality cards with explanations
**Cons**: Requires API call, ~10-30 seconds

---

### Method 3: Smart Generation from Document ⭐ BEST FOR STUDY MATERIALS
**How**:
1. Say "Show smart generation"
2. Upload a document (PDF, TXT, notes)
3. AI analyzes content and creates relevant flashcards
4. Name your deck

**Use Cases**:
- Course lecture notes
- Textbook chapters
- Study guides
- Wikipedia articles

**Pros**: Perfect for converting existing study materials
**Cons**: Requires uploading/pasting content

---

### Method 4: CSV Import 📁 BEST FOR ANKI USERS
**How**:
1. Say "Import a deck" or "Show import view"
2. Upload `.csv` or `.txt` file
3. Format: `Question,Answer,Explanation` (semicolon also works)

**CSV Example**:
```csv
What is photosynthesis?,Process plants use to convert light into energy,Requires chlorophyll and sunlight
Who wrote Hamlet?,William Shakespeare,Written around 1600
```

**Pros**: Bulk import, works with Anki exports
**Cons**: Requires preparing the CSV file

---

### Method 5: Weakness-Based Generation 🎯 ADAPTIVE LEARNING
**How**: Say "Strengthen my weaknesses in [Deck Name]"

**What it does**:
1. Analyzes your performance
2. Finds cards you struggle with
3. Generates 3 new related cards to help you master the topic

**Example**: If you keep failing "What is mitosis?", it creates cards about cell division phases, differences from meiosis, etc.

**Pros**: Personalized, targets your weak spots
**Cons**: Only works for existing decks with review history

---

## 3. Conversational Agent Behavior - Point-by-Point Reading ✅

### How the Voice Assistant Works:

**YES**, the agent reads everything point-by-point in a structured workflow:

#### Step-by-Step Review Flow:

1. **Session Start**
   - Say: "Start session"
   - Agent: "Hello! I'm Echo, your flashcard assistant. Say 'Start review for [deck name]' to begin."

2. **Begin Review**
   - Say: "Start review of World Capitals"
   - Agent: *Reads the question aloud*
   - Status: "Say 'Show Answer' when ready."

3. **Reveal Answer**
   - Say: "Show answer"
   - Agent: *Reads the answer aloud, then says* "How did you do? Say Again, Hard, Good, or Easy."

4. **Rate Your Performance**
   - Say: "Good" (or Again/Hard/Easy)
   - Agent: *Moves to next card and repeats from step 2*

5. **Review Complete**
   - Agent: "Review complete! Well done."

### Conversational Learning Mode 💡

**When enabled**, you can **interrupt** at any time to ask questions:

**During a review:**
- Say: "Why?" or "Explain this" or "Tell me more"
- Agent: *Provides detailed explanation*
- Then automatically returns to the review

**Example Flow with Interruption:**
```
Agent: "What is the capital of France?"
You: "Show answer"
Agent: "Paris. How did you do?"
You: "Wait, why is Paris the capital?"
Agent: "Paris became the capital of France in 987 AD when Hugh Capet..."
Agent: "Okay, let's continue. How did you do on the card?"
You: "Good"
Agent: *moves to next card*
```

### Voice Commands Summary:

**Review Commands:**
- "Start review of [deck name]"
- "Show answer"
- "Again" / "Hard" / "Good" / "Easy"

**Deck Management:**
- "Show my decks"
- "List decks"
- "Create a deck called [name]"
- "Delete deck [name]"

**Content Creation:**
- "Show smart generation" ← AI deck creation
- "Import a deck" ← CSV import
- "Create a card in [deck]..."
- "Strengthen my weaknesses in [deck]"

**Questions & Stats:**
- "Why?" / "Explain this" (during review)
- "Show stats for [card question]"
- "Explain this card" (when viewing stats)

**Other Features:**
- "Generate an image of [description]"
- "Analyze this image"
- "Transcribe audio"
- "Analyze this text"
- "Go back"

---

## Summary Table

| Method | Difficulty | Speed | Best For |
|--------|-----------|-------|----------|
| Voice Commands | Easy | Slow | 1-5 cards |
| Smart Generation (Topic) | Easy | Fast | New topics |
| Smart Generation (Document) | Easy | Fast | Study materials |
| CSV Import | Medium | Fast | Bulk import, Anki |
| Weakness Generation | Easy | Medium | Adaptive learning |

## Recommendations:

1. **Starting from scratch?** → Use Smart Generation from Topic
2. **Have Anki decks?** → Export to CSV, then import
3. **Have notes/PDFs?** → Use Smart Generation from Document
4. **Struggling with topics?** → Use Weakness Generation
5. **Just a few cards?** → Use voice commands

The app is designed for **hands-free, voice-first interaction** where the AI assistant guides you through every step!

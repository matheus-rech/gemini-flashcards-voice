# Portuguese Medical Flashcards - Cirurgia Geral

This document describes the Portuguese medical flashcards demo deck added to EchoCards.

## Deck Information

**Deck Name:** Cirurgia Geral - Revisão
**Deck ID:** `cirurgia-1`
**Total Cards:** 24
**Language:** Portuguese (Brazil)
**Subject:** General Surgery Review

## Purpose

This deck serves as:
1. **Demo content** for Portuguese-speaking users
2. **Test case** for Gemini Live API with non-English content
3. **Medical education** resource for surgery residents/students

## Dialog API Compatibility

### Voice Interaction Testing

The Gemini Live API has been tested with Portuguese content and supports:

✅ **Text-to-Speech (TTS)** in Portuguese
- Questions are read aloud in Portuguese
- Answers are spoken in Portuguese
- Explanations are vocalized correctly

✅ **Speech-to-Text (STT)** in Portuguese
- Voice commands work: "mostrar resposta", "próximo", "fácil", "difícil"
- Conversational mode works in Portuguese
- Questions about cards can be asked in Portuguese

✅ **Function Calling** remains in English
- System functions (startReview, showAnswer, rateCard) work regardless of content language
- The AI understands Portuguese user intent and calls the correct functions

### Example Voice Interactions

**Starting Review:**
```
User: "Comece a revisar Cirurgia Geral"
AI: → Calls startReview("Cirurgia Geral - Revisão")
AI: "Vamos revisar Cirurgia Geral! Aqui está sua primeira pergunta..."
```

**Showing Answer:**
```
User: "Mostre a resposta" or "Qual é a resposta?"
AI: → Calls showAnswer()
AI: Reads answer aloud in Portuguese
```

**Rating Cards:**
```
User: "Foi fácil" or "Isso foi difícil"
AI: → Calls rateCard("EASY") or rateCard("HARD")
AI: Confirms and moves to next card
```

**Conversational Learning:**
```
User: "Por que CA19-9 é usado no pâncreas?"
AI: → Calls startConversation(query)
AI: Provides detailed explanation in Portuguese
```

## Card Topics Covered

The deck covers essential topics in general surgery:

### Oncology (7 cards)
- Pancreatic cancer (markers, diagnosis, surgical criteria)
- Gastric cancer (staging, endoscopic resection)
- Gallbladder (prophylactic cholecystectomy indications)

### Gastrointestinal (5 cards)
- GERD diagnosis and surgery
- Inflammatory bowel disease (RCU)
- GI bleeding investigation
- Intestinal obstruction

### Hernia Surgery (2 cards)
- Femoral hernia anatomy and treatment
- Surgical approach

### Emergency Surgery (3 cards)
- Appendicitis management
- Burn patient airway management
- Antibiotic vs surgical treatment

### Vascular Surgery (2 cards)
- Pulmonary embolism (D-dimer indications)
- Critical limb ischemia (ankle-brachial index)

### Perioperative Care (3 cards)
- VTE prophylaxis (Caprini score, LMWH timing)
- Anesthesia (ketamine indications)
- Nutrition (refeeding syndrome)

### Surgical Techniques (2 cards)
- Laparoscopic appendectomy
- Antireflux surgery (fundoplication)

## Card Structure

Each card includes:

```typescript
{
  id: string,              // Unique identifier (med1-med24)
  deckId: 'cirurgia-1',    // Links to Cirurgia Geral deck
  question: string,        // Portuguese question
  answer: string,          // Concise Portuguese answer
  explanation: string,     // Detailed explanation in Portuguese
  difficulty: number,         // FSRS difficulty (e.g., 3 for easier, 5 for harder)
  // FSRS scheduling fields
  dueDate: Date,
  stability: 0,
  lapses: 0,
  reps: 0,
  state: 'NEW'
}
```

## Difficulty Distribution

- **Difficulty 3** (Easier): 8 cards - Basic recall questions
- **Difficulty 4** (Medium): 11 cards - Application/understanding
- **Difficulty 5** (Harder): 5 cards - Complex multi-step reasoning

## Testing the Cards

### Manual Testing Steps

1. **Clear localStorage** (to reset seed data):
   ```javascript
   localStorage.clear()
   ```

2. **Reload the application**
   - The seed data will reinitialize
   - "Cirurgia Geral - Revisão" deck will appear

3. **Start voice review**:
   ```
   Say: "Start reviewing Cirurgia Geral"
   or: "Comece a revisar Cirurgia Geral"
   ```

4. **Test interactions**:
   - Ask for answers in Portuguese
   - Rate cards using Portuguese commands
   - Ask conversational questions in Portuguese

### Expected Behavior

✅ **Gemini should**:
- Understand both Portuguese and English commands
- Read questions/answers in Portuguese with correct pronunciation
- Respond to Portuguese queries about card content
- Maintain proper FSRS scheduling regardless of language

✅ **FSRS Algorithm should**:
- Work identically to English cards
- Track lapses, reps, and stability
- Calculate due dates correctly
- Adapt difficulty based on performance

## Technical Notes

### Character Encoding
- All cards use UTF-8 encoding
- Special Portuguese characters (ã, ç, é, etc.) are properly stored
- Accents and diacritics are preserved in TTS/STT

### Voice Selection
- Gemini's Portuguese voice should automatically adjust
- Voice quality may vary by selected voice (Zephyr, Puck, etc.)
- Test with different voices for best pronunciation

### Function Calling
- System functions remain in English (implementation detail)
- User-facing responses are in Portuguese
- The AI translates intent → function call seamlessly

## Medical Accuracy

⚠️ **Disclaimer**: These cards are for educational demonstration purposes. Always verify medical information with current clinical guidelines and evidence-based resources.

**Content Sources**: Based on standard Brazilian surgical practice and international guidelines (as of 2024).

## Future Enhancements

Potential additions to the medical deck:

1. **Images**: Add anatomical diagrams for hernias, Barrett's esophagus, etc.
2. **Cloze Deletion**: "O marcador de câncer de pâncreas é {{c1::CA19-9}}"
3. **Audio Clips**: Pronunciation of medical terms
4. **Clinical Cases**: Multi-card scenarios
5. **References**: Link to guidelines (SBCP, ACS, etc.)

## Contribution

To add more Portuguese medical cards:

1. Edit `services/storageService.ts`
2. Add cards to `seedCards` array under `cirurgia-1` deck
3. Follow the existing format:
   ```typescript
   {
     id: 'med##',
     deckId: 'cirurgia-1',
     question: 'Pergunta em português?',
     answer: 'Resposta concisa',
     explanation: 'Explicação detalhada para contexto adicional.',
     difficulty: 3-5,
     // FSRS fields...
   }
   ```
4. Build and test with `npm run build`
5. Verify TTS/STT pronunciation

## Related Documentation

- [GEMINI_API_GUIDE.md](./GEMINI_API_GUIDE.md) - Function calling and API configuration
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- [SECURE_DEPLOYMENT.md](./SECURE_DEPLOYMENT.md) - Security considerations

---

**Total Cards**: 24
**Language**: Portuguese (pt-BR)
**Last Updated**: 2025-10-23

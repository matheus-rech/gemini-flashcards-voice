# EchoCards vs Anki: Quick Reference Guide

## One-Sentence Summary
**EchoCards**: Voice-first, AI-powered, FSRS algorithm, modern web app  
**Anki**: Mature, customizable, large ecosystem, offline-capable

---

## Feature Scorecards

### For Commuter Learning (Language, Audiobooks)
```
EchoCards: ★★★★★ (voice-native, AI explanations)
Anki:      ★★☆☆☆ (GUI-based, requires setup)
```

### For Professional Study (Law, Medicine)
```
EchoCards: ★★★☆☆ (good basics, limited customization)
Anki:      ★★★★★ (templates, cloze, statistics)
```

### For Casual Learning (Random trivia)
```
EchoCards: ★★★★★ (instant deck generation, hands-free)
Anki:      ★★★★☆ (large deck library available)
```

### For Long-term Serious Study
```
EchoCards: ★★★☆☆ (needs cloud sync, statistics)
Anki:      ★★★★★ (proven, reliable, 15+ years)
```

### For Mobile-First Users
```
EchoCards: ★★☆☆☆ (web-based, not optimized)
Anki:      ★★★★★ (AnkiDroid, AnkiMobile, AnkiWeb)
```

---

## The Differentiators

### EchoCards Advantages (Reasons to Choose)
| Feature | Impact | Use Case |
|---------|--------|----------|
| **Voice Control** | Hands-free operation | Commute, exercise, multitasking |
| **AI Explanations** | Instant understanding | Learning new concepts |
| **FSRS Algorithm** | 20-30% faster learning | Efficiency-focused students |
| **Auto Deck Generation** | 5-minute setup | Lazy learners, topic exploration |
| **Weakness Targeting** | Smart remediation | Struggling areas |
| **Image Generation** | Visual learning aids | Visual learners |
| **Conversational Mode** | Interrupt to ask questions | Deep learning |

### Anki Advantages (Reasons to Choose)
| Feature | Impact | Use Case |
|---------|--------|----------|
| **Cloze Deletion** | Language-specific | Language learners (Chinese, Japanese, etc.) |
| **Custom Templates** | Flexible card types | Medical diagrams, complex formats |
| **Statistics Dashboard** | Track progress | Motivated students, analytics-driven |
| **Offline Support** | No internet needed | Traveling, rural areas, flights |
| **Device Sync** | Study anywhere | Work/home/mobile switching |
| **Plugin Ecosystem** | Extended functionality | Power users, custom workflows |
| **Deck Sharing** | 100k+ ready decks | Quick-start, established subjects |
| **Proven Reliability** | Stable, mature | Mission-critical study (board exams) |

---

## Decision Tree

```
START
  |
  +-- Need hands-free? (commute, exercise)
  |     |-- YES --> Consider EchoCards
  |     |-- NO --> Continue
  |
  +-- Need cloze deletion? (language learning)
  |     |-- YES --> Use Anki
  |     |-- NO --> Continue
  |
  +-- Need device sync?
  |     |-- YES --> Use Anki (EchoCards needs backend)
  |     |-- NO --> Continue
  |
  +-- Need offline?
  |     |-- YES --> Use Anki (EchoCards requires API)
  |     |-- NO --> Continue
  |
  +-- Want AI help + fewer clicks?
  |     |-- YES --> EchoCards
  |     |-- NO --> Anki for customization
  |
  +-- Learning established subject?
  |     |-- YES --> Anki (100k decks available)
  |     |-- NO --> EchoCards (generate from docs)
  |
  END
```

---

## Cost Comparison

### EchoCards
| Item | Cost | Notes |
|------|------|-------|
| App | Free | Open source/web-based |
| API (Gemini) | ~$9/month | 100 reviews/day |
| TTS | Included | 24k Hz output |
| Image Gen | ~$2-5/month | Imagen 4.0 |
| Storage | Free | LocalStorage (limited) |
| **Total** | **~$11-14/month** | Recurring if active user |

### Anki
| Item | Cost | Notes |
|------|------|-------|
| Desktop | Free | All features |
| AnkiWeb Sync | $0 or $9.99/year | Optional |
| AnkiDroid (Android) | Free | Community-supported |
| AnkiMobile (iOS) | $24.99 | One-time purchase |
| Decks | Free | 100k+ available |
| **Total** | **$0-35** | Mostly one-time |

---

## Technical Depth Comparison

### EchoCards Architecture
```
Voice Input
    ↓
Gemini Live API (WebSocket)
    ├─ Voice-to-text transcription
    ├─ Function calling (24 tools)
    └─ Text-to-speech response
    ↓
Unified Audio Queue
    ↓
Web Audio API Output
    ↓
LocalStorage Persistence
```

**Strengths**: Real-time interaction, modern stack  
**Weaknesses**: API dependency, no sync, single device

### Anki Architecture
```
User Input (Qt/Web)
    ↓
Collection Manager
    ├─ SQLite Database
    ├─ Scheduler (SM-2)
    └─ Card State Machine
    ↓
Optional AnkiWeb Sync
    ↓
Persistence
```

**Strengths**: Mature, offline-capable, extensible  
**Weaknesses**: Complexity, steeper learning curve

---

## Algorithm Comparison: FSRS vs SM-2

### SM-2 (Anki's Algorithm)
```
Rating: 1=Forget, 2=Hard, 3=Good, 4=Easy

Ease Factor = 1.3 (default)
EF' = EF + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))

Interval Multiplied by EF on success
```
**Pros**: Simple, fast, proven  
**Cons**: Single factor per card, not scientifically optimized

### FSRS (EchoCards' Algorithm)
```
17 ML-optimized weights trained on 60M+ reviews

Tracks per-card:
  - Stability: How well you know it
  - Difficulty: How hard the card is
  - State: NEW → LEARNING → REVIEW → RELEARNING

Complex exponential calculations for next interval
Predicts retention probability
```
**Pros**: Scientifically superior, 20-30% efficiency gain  
**Cons**: Complex, harder to understand

---

## Content Creation Comparison

### EchoCards: How to Create Cards

```
Option A: Voice Command
"Create a deck on photosynthesis with 10 intermediate cards"
→ AI generates complete deck in 30 seconds

Option B: Upload Document
Select PDF/TXT → AI extracts key concepts → Cards created

Option C: Manual Entry
"Create card in biology deck"
"Question: What is photosynthesis?"
"Answer: Process where plants convert light to energy"

✓ FASTEST: 30 seconds (Option A)
⚠ NO CLOZE support
```

### Anki: How to Create Cards

```
Option A: Desktop Interface
Click "Add" → Select note type → Fill fields → Save
→ Takes 30-60 seconds per card

Option B: Import CSV
Prepare spreadsheet → Import → 30 cards in 5 seconds

Option C: Cloze Cards (Recommended for language)
Question: "The capital of France is [...]"
Answer: "Paris"
→ Auto-generates multiple variations

✓ CLOZE DELETION available
✓ TEMPLATES for complex structures
⚠ Manual for large decks
```

---

## The 80/20 Analysis

### What 20% of EchoCards' Features Do 80% of the Work
1. **Voice control** - Makes studying effortless
2. **FSRS algorithm** - Best learning efficiency
3. **AI deck generation** - Eliminates content creation friction
4. **Conversational explanations** - Accelerates understanding
5. **Study goal tracking** - Motivation & accountability

### What 20% of Anki's Features Do 80% of the Work
1. **Spaced repetition** - Core of learning system
2. **Desktop interface** - Full-featured, responsive
3. **Deck sharing** - Access 100k community decks
4. **Multi-device sync** - Study anywhere
5. **Statistics** - Track progress & motivation

---

## Red Flags & Gotchas

### EchoCards ⚠️
- **No data backup**: Clear browser cache → lose everything
- **No offline**: Requires internet for Gemini API
- **Single device**: No sync across phone/desktop
- **API costs**: $10-15/month for active users
- **No cloze**: Major limitation for language learning
- **Immature**: Months old, may have bugs/changes
- **Web only**: No native mobile app

### Anki ⚠️
- **Steep learning curve**: Templates, settings overwhelming
- **GUI-only**: No voice control at all
- **No built-in AI**: Must install add-ons for explanations
- **Sync costs**: AnkiWeb $9.99/year optional
- **Complex scheduler**: SM-2 less optimal than FSRS
- **Updates slower**: Python-based, slower development

---

## Hybrid Strategy: Using Both

### Best of Both Worlds
```
┌─────────────────────────────────────────────────────┐
│ Phase 1: Quick Learning (EchoCards)                │
│ └─ Generate deck from article/topic                │
│ └─ Voice interaction while commuting               │
│ └─ Get AI explanations when confused               │
├─────────────────────────────────────────────────────┤
│ Phase 2: Long-term Mastery (Anki)                 │
│ └─ Export EchoCards deck to CSV                    │
│ └─ Convert to Anki format                          │
│ └─ Add cloze deletions for language                │
│ └─ Track 6-month+ learning in statistics           │
│ └─ Sync across desktop/mobile                      │
└─────────────────────────────────────────────────────┘
```

**When to use EchoCards**: Exploration, quick learning, commute study  
**When to use Anki**: Deep mastery, long-term retention, board exams

---

## Final Verdict Summary

| User Type | Best Choice | Why |
|-----------|------------|-----|
| **Commuter** | EchoCards | Voice-native, no setup |
| **Language Learner** | Anki | Cloze deletion crucial |
| **Busy Professional** | EchoCards | AI shortcuts save time |
| **Medical Student** | Anki | Statistics, templates, community decks |
| **Lifelong Learner** | EchoCards for exploration, then Anki | Best combo |
| **Accessibility Needs** | EchoCards | Only voice option |
| **Offline Traveler** | Anki | Works on plane |
| **Tech Enthusiast** | EchoCards | Modern stack, interesting architecture |
| **Conservative** | Anki | Proven, 15 years old |
| **Experimental** | EchoCards | Cutting-edge AI |

---

**Conclusion**: EchoCards is the future of learning apps (AI + voice + superior algorithm), but Anki is the mature choice (tested + feature-complete + ecosystem). Ideally, use EchoCards for initial learning + Anki for long-term mastery.

# EchoCards Command Center (Expo)

A React Native (Expo SDK 57) companion app for Anki. **Anki Desktop is the single source of truth** — this app stores no decks, cards, or scheduling data of its own (only settings). It is a remote control and agent hub for your real Anki collection, connected over [AnkiConnect](https://foosoft.net/projects/anki-connect/).

## What it does

- **Live deck dashboard** — scheduler-accurate new/learning/review counts per deck via `getDeckStats` (the same numbers Anki's deck browser shows); pull to refresh.
- **Review = remote-controlling Anki's real reviewer.** Opening a review here runs `guiDeckReview` in Anki Desktop; the phone mirrors what's on the Anki screen (`guiCurrentCard`, including the real next-interval labels on each button) and every tap clicks the actual button in the Anki window (`guiShowAnswer` / `guiAnswerCard`). Cards are read aloud point-by-point (`expo-speech`).
- **Echo Agent** — a Gemini-powered command agent (`gemini-2.5-flash` function calling) that can *see the Anki screen and click its buttons*:
  - `getCurrentCard` / `showAnswer` / `answerCurrentCard` / `undo` — drive the desktop reviewer directly
  - `listDecks` (with queue counts) / `createDeck` / `addFlashcards` — the agent writes card content and inserts it straight into Anki
  - `openDeckReview` / `startReview` — open a review in Anki, or in this app
  - `syncAnkiWeb` — trigger Anki's own cloud sync
  Say things like *"create 10 cards about the Krebs cycle in my Biology deck"*, *"what's on the screen?"*, or *"I forgot that one — rate it"*. Replies are spoken aloud.

### Why GUI-driven (accuracy notes, verified against the Anki source)

- A raw `findCards "is:due"` queue is **wrong**: `is:due` excludes new cards (`rslib/src/search/sqlwriter.rs`), and a raw search ignores daily limits, sibling burying, and the v3 scheduler's gather/interleave order (`rslib/src/scheduler/queue/builder/`). Only Anki's own reviewer yields the true next-card sequence — so we drive it.
- Ratings are `1=Again, 2=Hard, 3=Good, 4=Easy`, exactly as in `qt/aqt/reviewer.py::_answerCard` and the scheduler's `Rating::as_number()`. All four are always available under the v3 scheduler.
- With native FSRS (Anki 23.10+), **Again is the only failing grade** — the agent is instructed to never use Hard as a fail substitute, never to touch intervals/ease directly, and to treat intervals as non-deterministic (±~5% fuzz).

Your Gemini API key is entered in Settings and stored only on-device — it is never baked into the binary.

## Realtime voice (cloud-independent)

The **Live Voice** screen holds a hands-free, interruptible conversation with the agent over the **OpenAI Realtime WebSocket protocol** — which makes the speech backend interchangeable:

- **Local / no-cloud (fallback when cloud models don't work, or the main option):** run [huggingface/speech-to-speech](https://github.com/huggingface/speech-to-speech) on the same computer as Anki. It's a full local pipeline (Silero VAD → Whisper/Parakeet STT → any LLM incl. llama.cpp → Qwen3-TTS/Kokoro) that serves the Realtime protocol:

  ```bash
  pip install speech-to-speech   # Python 3.10+, CUDA / Apple Silicon / CPU
  speech-to-speech --mode realtime --ws_port 8766
  ```

  > ⚠️ **Port conflict:** speech-to-speech ALSO defaults to port **8765**, which AnkiConnect already uses on that machine. Always pass `--ws_port 8766`.

  Then set **Settings → Realtime voice server** to `ws://<that computer>:8766/v1/realtime`. For a fully offline LLM, point it at a local llama.cpp server (`--responses_api_base_url http://127.0.0.1:8080/v1`).

- **Cloud:** any endpoint speaking the same protocol works — just change the URL.

Audio is 16 kHz mono PCM16 both ways; the server's VAD handles turn-taking and barge-in. **Anki tool calls flow through the voice channel too**: the session registers the same tools as the text agent (see screen, click buttons, add cards…), the app executes them against AnkiConnect, and returns results to the voice LLM mid-conversation.

Platform note: the full mic ↔ speaker loop currently ships in the **web build** (`npm run web` on the desktop next to Anki — the natural place for realtime voice). Native iOS/Android needs a raw-PCM microphone-stream module (e.g. `react-native-live-audio-stream`) wired into `VoiceScreen`; until then phones use the Echo Agent text chat, which still speaks its replies.

## Running locally

```bash
cd mobile
npm install
npm start          # scan the QR code with Expo Go
npm run web        # or run in a browser
```

## Building an installable APK

Every push builds one in CI: see the **Mobile app (typecheck + Android APK)** job in GitHub Actions and download the `echocards-android-apk` artifact. It's signed with the standard debug keystore — ready to sideload onto any Android device. For a Play Store release, configure a real signing keystore (or use EAS Build: `npx eas build -p android`).

iOS builds require a macOS runner or EAS Build with Apple credentials — not wired up in CI.

## Connecting to Anki from a phone

Your phone can't reach `localhost` on your computer. In **Settings → AnkiConnect host**, enter your computer's LAN address, e.g. `http://192.168.1.20:8765`, and configure the AnkiConnect add-on (Tools → Add-ons → AnkiConnect → Config) to accept LAN connections:

```json
{
  "webBindAddress": "0.0.0.0",
  "webCorsOriginList": ["*"]
}
```

Restart Anki after changing the config, keep it running, and approve the permission popup in Anki Desktop on first connect. Both devices must be on the same network.

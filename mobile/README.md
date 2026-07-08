# EchoCards Command Center (Expo)

A React Native (Expo SDK 57) companion app for Anki. **Anki Desktop is the single source of truth** — this app stores no decks, cards, or scheduling data of its own (only settings). It is a remote control and agent hub for your real Anki collection, connected over [AnkiConnect](https://foosoft.net/projects/anki-connect/).

## What it does

- **Live deck dashboard** — deck names and due counts stream straight from Anki; pull to refresh.
- **Review from your phone** — due cards are fetched live, read aloud point-by-point (`expo-speech`), and every Again/Hard/Good/Easy rating is applied through **Anki's own scheduler** (`answerCards`). Nothing is duplicated or re-scheduled locally.
- **Echo Agent** — a Gemini-powered command agent (`gemini-2.5-flash` function calling) with tools that operate directly on Anki:
  - `listDecks` / `countDueCards` — inspect the collection
  - `createDeck` / `addFlashcards` — the agent writes card content and inserts it straight into Anki
  - `startReview` — the agent can command this app to open a review session
  - `syncAnkiWeb` — trigger Anki's own cloud sync
  Say things like *"create 10 cards about the Krebs cycle in my Biology deck"* or *"what's due today?"*. Replies are spoken aloud.

Your Gemini API key is entered in Settings and stored only on-device — it is never baked into the binary.

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

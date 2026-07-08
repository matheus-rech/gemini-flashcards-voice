# EchoCards Mobile (Expo)

A React Native (Expo SDK 57) port of the EchoCards voice-powered flashcard app.

## Features

- **FSRS-4.5 spaced repetition** — the exact same scheduler as the web app (`src/services/fsrs.ts` is a direct port).
- **Spoken reviews** — each question and answer is read aloud point-by-point with the device's text-to-speech (`expo-speech`); toggle in Settings.
- **AI deck generation** — create a full deck from any topic via the Gemini API (`gemini-2.5-pro`). Your API key is entered in Settings and stored only on-device.
- **AI explanations** — during review, ask for a deeper explanation of the current card.
- **Anki sync** — import decks from Anki Desktop via AnkiConnect and keep review progress in sync both ways (ratings replay through each system's own scheduler; internal scheduling data is never touched).

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

## Anki sync from a phone

Your phone can't reach `localhost` on your computer. In **Settings → AnkiConnect host**, enter your computer's LAN address, e.g. `http://192.168.1.20:8765`, and configure the AnkiConnect add-on (Tools → Add-ons → AnkiConnect → Config) to accept LAN connections:

```json
{
  "webBindAddress": "0.0.0.0",
  "webCorsOriginList": ["*"]
}
```

Restart Anki after changing the config, keep it running, and approve the permission popup on first connect. Both devices must be on the same network. See also `../ANKI_SETUP.md` for what syncs and known limitations (Basic note types only; the two schedulers' due dates diverge by design).

# Anki Integration Setup

EchoCards can link to your **local** Anki Desktop app via [AnkiConnect](https://foosoft.net/projects/anki-connect/), letting you import decks and keep review progress in sync.

> **This is local-only.** It requires EchoCards (`npm run dev`) and Anki Desktop to be running on the **same computer**. There is no cloud or AnkiWeb path — a deployed/hosted EchoCards instance cannot reach an Anki app on a different machine.

## Setup

1. Install [Anki Desktop](https://apps.ankiweb.net/) if you haven't already.
2. In Anki: **Tools → Add-ons → Get Add-ons...** and enter the code `2055492159` (AnkiConnect).
3. Restart Anki Desktop.
4. Keep Anki Desktop **running in the background** while you use EchoCards — the connection only works while it's open.

## Connecting for the first time

1. In EchoCards, click **"Import from Anki"** (on the deck list) or say *"import a deck from Anki"*.
2. The first time, a popup will appear in Anki Desktop asking to allow a connection from `http://localhost:3000` (or whatever port `npm run dev` is using). Click **Yes/Allow**.
3. If you miss the popup or accidentally deny it, just retry from EchoCards — it will ask again.

## What syncs, and how

- **Content** (question/answer/explanation): imported from the Anki note's fields — first field becomes the question, second becomes the answer, third (if present) becomes the explanation.
- **Review progress**: EchoCards does **not** read or write Anki's internal scheduling data directly — that's too version-fragile and risks corrupting your real Anki collection. Instead:
  - **Push**: when you rate a linked card in EchoCards (Again/Hard/Good/Easy), that same rating is replayed into Anki via its own `answerCards` action — equivalent to clicking the button yourself in Anki's reviewer.
  - **Pull**: clicking **"Sync with Anki"** (or saying *"sync with Anki"*) fetches any reviews you did natively in Anki since the last sync and replays them through EchoCards' own FSRS scheduler.
  - Because EchoCards (FSRS) and Anki use different scheduling algorithms, their computed due dates and intervals will gradually diverge even though they're fed the same ratings — that's expected, not a bug. "Sync" here means rating events are mirrored, not that the two systems' internal numbers stay identical.

## Note type limitation

Only **Basic** and **Basic (and reversed card)** style note types map cleanly (field 1 → question, field 2 → answer, field 3 → explanation if present). **Cloze deletion decks are not supported** and will be skipped during import.

## Troubleshooting

- **"Couldn't reach Anki Desktop"**: make sure Anki is running, and that AnkiConnect is installed (**Tools → Add-ons** should list "AnkiConnect"). Try restarting Anki.
- Still failing: check that no firewall or VPN is blocking `localhost:8765`.
- If you've configured an API key in AnkiConnect's own settings, note that this integration does not currently support it — leave AnkiConnect's `apiKey` config unset.

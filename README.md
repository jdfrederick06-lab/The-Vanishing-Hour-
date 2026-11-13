# The Vanishing Hour

The website for *The Vanishing Hour*, an interactive murder mystery set at the Ashgrove Gala.

**Test build:** everything saves only in the browser you're using (`BACKEND: 'local'` in `settings/config.js`).
Phones can't see each other yet, and RSVPs sent from this site reach nobody.

## What's where

| Folder or file | What it is |
|---|---|
| `index.html` | **The invitation**, the page everyone sees first: the rules of the night, when and where, and the reply card. From here, players go through to the gala door |
| `gala/` | The gala door (the engraved card where players type their code word) |
| `fbi/`, `bebbit/`, `nightwire/` | The three disguised doors. Any code word works at any door |
| `app.html` | The player app (FBI Headquarters, Bebbit or NIGHTWIRE, with NightBank, the casino and "My file") |
| `host.html` | The host terminal |
| `rsvp.html` | Old link only: it forwards to the invitation |
| `settings/story.js` | **The whole story:** characters, code words, phases, cues, records, money. Edit this, not the code |
| `settings/dossiers.js` | All 40 dossiers, shown to each player under "My file" (made from the planning doc) |
| `settings/config.js` | The title, the event details on the invitation, and where data is saved |
| `css/` | The look: `invite.css` (the invitation), `theme.css` (the five worlds), `fx.css` (animations, doors, NightBank, casino, dossiers), `host.css` (host terminal) |
| `js/` | The code: `invite.js` (the invitation and replies), `core.js` (sync and clock), `door.js`, `app.js`, `host.js`, `bebbit.js`, `fbi.js`, `nightwire.js` (NIGHTWIRE and NightBank), `casino.js`, `dossier.js` |

## Before the real night

`settings/story.js` and `settings/dossiers.js` are plain text with every secret, answer and code word in them.
The invitation page doesn't load either of them, so it can go online first.
Before players get the link, the plan is: lock the code words, replace the story files with locked
versions, and connect a real database so phones sync and RSVPs reach the host.

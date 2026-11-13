# The Vanishing Hour

The website for *The Vanishing Hour*, an interactive murder mystery set at the Ashgrove Gala.

**Test build:** everything saves only in the browser you're using (`BACKEND: 'local'` in `settings/config.js`).
Phones can't see each other yet, and RSVPs sent from this site reach nobody.

## What's where

| Folder or file | What it is |
|---|---|
| `index.html` | The gala front door (the engraved invitation where players type their code word) |
| `fbi/`, `bebbit/`, `nightwire/` | The three disguised doors. Any code word works at any door |
| `app.html` | The player app (FBI Headquarters, Bebbit or NIGHTWIRE, with NightBank and the casino) |
| `host.html` | The host terminal |
| `rsvp.html` | The invitation and RSVP page |
| `settings/story.js` | **The whole story:** characters, code words, phases, cues, records, money. Edit this, not the code |
| `settings/config.js` | The title, the event details on the invitation, and where data is saved |
| `css/` | The look: `theme.css` (the five worlds), `fx.css` (animations, doors, NightBank, casino, RSVP), `host.css` (host terminal) |
| `js/` | The code: `core.js` (sync and clock), `door.js`, `app.js`, `host.js`, `bebbit.js`, `fbi.js`, `nightwire.js` (NIGHTWIRE and NightBank), `casino.js`, `rsvp.js` |

## Before the real night

`settings/story.js` is plain text with every secret, answer and code word in it.
Before players get the link, the plan is: lock the code words, replace `story.js` with a locked
version, and connect a real database so phones sync and RSVPs reach the host.

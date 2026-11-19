# The Vanishing Hour

The website for *The Vanishing Hour*, an interactive murder mystery set at the Ashgrove Gala.

**Online:** the pages are served by GitHub Pages and the live data (replies, the night's game) is kept in a
Firebase Realtime Database (`BACKEND: 'firebase'` in `settings/config.js`). Nothing can be read or changed
without a code word. Set `BACKEND: 'local'` to test on one computer without touching the real data.

## What's where

| Folder or file | What it is |
|---|---|
| `index.html` | **The invitation**, the page everyone sees first: the rules of the night, when and where, and the reply card. From here, players go through to the gala door |
| `gala/` | The gala door (the engraved card where players type their code word) |
| `fbi/`, `bebbit/`, `nightwire/` | The three disguised doors. Any code word works at any door |
| `app.html` | The player app (FBI Headquarters, Bebbit or NIGHTWIRE, with NightBank, the casino and "My file") |
| `host.html` | The host terminal |
| `rsvp.html` | Old link only: it forwards to the invitation |
| `print.html` | Print the evidence (host only): every clue with its FBI tag and QR code |
| `scan.html` | Where a scanned QR tag lands: logs the piece and shares it with everyone |
| `reveal.html` | The big screen for a projector (host only): the vote coming in, then the reveal slides |
| `posters.html` | Posters and signs (host only): pick which ones and which version, then print or save as PDF |
| `badges.html` | Badges for 3.5 x 2.5 inch sleeves, eight to a sheet with cutting gaps (host only) |
| `settings/story.js` | **The whole story:** characters, code words, phases, cues, records, money, the vote, Bebbit profiles. Edit this, not the code |
| `settings/dossiers.js` | All 40 dossiers, shown to each player under "My file" |
| `settings/evidence.js` | The printed evidence, the props, and the eight mini-games |
| `settings/reveal.js` | The reveal slides (only the host terminal and the big screen load it) |
| `settings/config.js` | The title, the event details on the invitation, and where data is saved |
| `css/` | The look: `invite.css` (the invitation), `theme.css` (the five worlds), `fx.css` (animations, doors, NightBank, casino, dossiers), `host.css`, `vote.css`, `bigscreen.css`, `revealart.css`, `printables.css` |
| `js/` | The code: `core.js` (sync, sign-in and clock), `invite.js`, `door.js`, `app.js`, `host.js`, `bebbit.js`, `fbi.js`, `nightwire.js`, `casino.js`, `dossier.js`, `games.js`, `vote.js`, `reveal.js`, `bigscreen.js`, `art.js`, `evdoc.js`, `print.js`, `scan.js`, `printables.js` |

## Before the real night

The story files are plain text for now. The invitation page doesn't load them.
Before invitations go out they get replaced with locked versions.

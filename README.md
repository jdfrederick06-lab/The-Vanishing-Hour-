# The Vanishing Hour

The website for *The Vanishing Hour*, an interactive murder mystery set at the Ashgrove Gala.

**Online:** the pages are served by GitHub Pages and the live data (replies, the night's game) is kept in a
Firebase Realtime Database. Nothing can be read or changed without a code word, and each phone only
downloads what it may see (public, its group's, its own). On `localhost` the site runs in test mode
(`BACKEND: 'local'`), saving only in that browser.

## What's where

| Folder or file | What it is |
|---|---|
| `index.html` | **The invitation**, the page everyone sees first: the rules of the night, when and where, and the reply card. From here, players go through to the gala door |
| `gala/` | The gala door (the engraved card where players type their code word) |
| `fbi/`, `bebbit/`, `nightwire/` | The three disguised doors. Any code word works at any door |
| `app.html` | The player app (FBI Headquarters, Bebbit or NIGHTWIRE, with NightBank, the casino and "My file"). NIGHTWIRE is disguised as **Omnizon, a Nightwire company**: an ordinary-looking online store (shop, product page, checkout, wallet, Seller Central, crew messages) |
| `host.html` | The host terminal |
| `rsvp.html` | Old link only: it forwards to the invitation |
| `print.html` | Print the evidence (host only): every clue with its FBI tag and QR code |
| `scan.html` | Where a scanned QR tag lands: logs the piece and shares it with everyone |
| `books.html` | Host books, cheat cards and dossier printouts (host only) |
| `img/` | June's painting (a public-domain Cassatt from the National Gallery of Art's open access) |
| `tap.html` | Where the NFC tag lands: a different line for each group or person |
| `reveal.html` | The big screen for a projector (host only): the vote coming in, then the reveal slides |
| `posters.html` | Posters and signs (host only): pick which ones and which version, then print or save as PDF |
| `badges.html` | Badges for 3.5 x 2.5 inch sleeves, eight to a sheet with cutting gaps (host only) |
| `settings/locked/` | **The story, locked.** Each code word unlocks only what that phone needs; without one it can't be read. Built from private files that never go online |
| `settings/public.js` | What a page knows before anyone signs in |
| `settings/config.js` | The title, the event details on the invitation, and where data is saved |
| `js/boot.js` | Unlocks the story with the phone's code word, then starts the page |
| `css/` | The look: `invite.css` (the invitation), `theme.css` (the five worlds), `fx.css` (animations, doors, NightBank, casino, dossiers), `host.css`, `vote.css`, `bigscreen.css`, `revealart.css`, `printables.css`, `omnizon.css` (NIGHTWIRE's store look and its sign-in page) |
| `js/` | The code: `core.js` (sync, sign-in and clock), `invite.js`, `door.js`, `app.js`, `host.js`, `bebbit.js`, `fbi.js`, `nightwire.js`, `casino.js`, `dossier.js`, `games.js`, `vote.js`, `reveal.js`, `bigscreen.js`, `art.js`, `evdoc.js`, `print.js`, `scan.js`, `tap.js`, `printables.js`, `books.js` |

## The story is locked

The plain story files are kept off the site. What's here is encrypted with the code words.

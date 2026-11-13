/* =====================================================================
   THE VANISHING HOUR — a scanned evidence tag (scan.html?e=CODE).
   Scanning logs the piece (state ev/{code} = { by, at }), marks its clue found on the
   host board, and shows a copy. ?v=1 just shows it (from the evidence room in the app).
   Only someone signed in on this phone can log a piece.
   ===================================================================== */
(function () {
  const p = new URLSearchParams(location.search), code = (p.get('e') || '').toUpperCase(), viewOnly = p.get('v') === '1';
  const piece = (STORY.evidence || []).find(x => x.code === code);
  const me = Session.lastPlayer(), host = Session.lastHost();
  const room = s => { const ev = Object.entries(s.ev || {}).map(([c, x]) => Object.assign({ c }, x, STORY.evidence.find(e => e.code === c))).filter(x => x.title).sort((a, b) => a.item - b.item); return ev.length ? `<div class="sc-room"><div class="who">The evidence room · ${ev.length} logged</div>${ev.map(x => `<a href="scan.html?e=${encodeURIComponent(x.c)}&v=1"><span>ITEM ${x.item}</span>${esc(x.title)}</a>`).join('')}</div>` : ''; };
  const top = '<div class="sc-top"><b>FBI</b><span>Case ' + esc(STORY.evidenceCase || '') + ' · Evidence</span></div>';
  if (!piece) { $('#root').innerHTML = `<div class="sc">${top}<div class="sc-warn">This tag doesn't match any evidence in the case.</div>${room(DB.get())}</div>`; return; }

  let banner = '';
  const s = DB.fresh(), who = me || host;
  if (viewOnly) banner = '';
  else if (!who) banner = `<div class="sc-warn">To log this piece, sign in on this phone first: open the <a href="gala/">gala door</a> and type your code word, then scan the tag again.</div>`;
  else if (s.ev && s.ev[code]) { const by = G.byId(s.ev[code].by); banner = `<div class="sc-ok">Already logged${by ? ' by ' + esc(by.name) : ''} at ${esc(wallTime(s.ev[code].at))}. Everyone can read it in the evidence room.</div>`; }
  else {
    const u = { ['ev/' + code]: { by: who.id || 'host', at: Date.now() } };
    if (piece.clue && !(s.clues && s.clues[piece.clue])) u['clues/' + piece.clue] = { at: Date.now(), by: 'Scanned: ' + piece.title };
    Clock.log(u, 'evidence', `${who.name || who.label} scanned item ${piece.item}: ${piece.title}.`);
    DB.update(u);
    banner = `<div class="sc-ok"><b>Logged.</b> Item ${piece.item} is in the evidence room now, where everyone can read it.${me ? ` <a href="app.html">Back to your phone</a>` : ''}</div>`;
    try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(60); } catch (e) { }
  }
  document.title = 'Item ' + piece.item + ' · Evidence';
  $('#root').innerHTML = `<div class="sc">${top}${banner}<h1>${esc(piece.title)}</h1><p class="who">Item ${piece.item}${viewOnly && s.ev && s.ev[code] && G.byId(s.ev[code].by) ? ' · logged by ' + esc(G.byId(s.ev[code].by).name) : ''}</p>${EvDoc.sheet(piece, { phone: true, noTag: true })}${room(DB.get())}</div>`;
})();

/* =====================================================================
   THE VANISHING HOUR — the NFC tag (tap.html?t=<tag id>).
   One tag, a different secret for each group or person (settings/evidence.js > STORY.nfc).
   It knows who's tapping the same way a scanned QR does: the phone's sign-in.
   Every tap goes in the host's log. Before the tag "opens" on the game clock it shows nothing.
   ===================================================================== */
DB.loaded().then(function () {
  const id = (new URLSearchParams(location.search).get('t') || '').toLowerCase();
  const tag = (STORY.nfc || {})[id];
  const host = Session.lastHost(), me = host ? null : Session.lastPlayer();
  const top = '<div class="sc-top"><b>&#9673;</b><span>The Ashgrove Gala</span></div>';
  const page = inner => { $('#root').innerHTML = `<div class="sc">${top}${inner}</div>`; };
  if (!tag) return page('<div class="sc-warn">This tag isn\'t part of tonight.</div>');
  if (!me && !host) return page('<div class="sc-warn">Nothing happens. Sign in on this phone first (open the <a href="gala/">gala door</a> and type your code word), then tap again.</div>');

  const s = DB.get(), r = Clock.read(s), o = tag.opens || {};
  const pi = o.phase ? STORY.phases.findIndex(p => p.id === o.phase) : -1;
  const open = !!host || r.state === 'over' || (pi < 0 ? r.state !== 'before' : r.i >= pi);
  const line = me ? ((tag.people || {})[me.id] || (tag.groups || {})[me.group] || '') : null;

  if (me) { const u = {}; Clock.log(u, 'evidence', `${me.name} tapped the NFC tag (${tag.where || id})${open ? '' : ' before it opened'}.`); DB.update(u); }
  try { if (navigator.vibrate && open && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(40); } catch (e) { }

  if (!open) return page('<h1>' + esc(tag.title || 'A small tag') + '</h1><p class="who">A blank sticker. Nothing on it yet.</p>');
  if (host) {
    /* hosts see every version, to check the wording */
    const rows = Object.entries(tag.groups || {}).map(([g, t]) => `<div class="sc-ok"><b>${esc((STORY.groups[g] || {}).name || g)}:</b> ${esc(t)}</div>`)
      .concat(Object.entries(tag.people || {}).map(([p, t]) => `<div class="sc-ok"><b>${esc((G.byId(p) || {}).name || p)} only:</b> ${esc(t)}</div>`));
    return page(`<h1>${esc(tag.title || id)}</h1><p class="who">Host view · ${esc(tag.where || '')}</p>${rows.join('')}`);
  }
  page(`<h1>${esc(tag.title || 'A small tag')}</h1><p class="who">${esc(me.name.split(' ')[0])}, only you can see this.</p><div class="sc-ok">${esc(line || 'Nothing here means anything to you.')}</div><p class="who"><a href="app.html">Back to your phone</a></p>`);
});

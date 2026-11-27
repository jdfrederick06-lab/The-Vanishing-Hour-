/* =====================================================================
   THE VANISHING HOUR — the NFC tags (tap.html?t=<tag id>).
   Three kinds of tag (settings/evidence.js > STORY.nfc):
     the story tag   (frame) a different line for each group or person, part of the mystery
     quest tags      (quest: ...) the stops of Cliff's Coat, the sidequest (STORY.coat)
     (the oddities are not tags: they live in the apps, see STORY.eggs)
   It knows who's tapping the same way a scanned QR does: the phone's sign-in.
   Every tap goes in the host's log.
   ===================================================================== */
DB.loaded().then(function () {
  const id = (new URLSearchParams(location.search).get('t') || '').toLowerCase();
  const tag = (STORY.nfc || {})[id];
  const host = Session.lastHost(), me = host ? null : Session.lastPlayer();
  const top = '<div class="sc-top"><b>&#9673;</b><span>The Ashgrove Gala</span></div>';
  const page = inner => { $('#root').innerHTML = `<div class="sc">${top}${inner}</div>`; };
  const back = '<p class="who"><a href="app.html">Back to your phone</a></p>';
  if (!tag) return page('<div class="sc-warn">This tag isn\'t part of tonight.</div>');
  if (!me && !host) return page('<div class="sc-warn">Nothing happens. Sign in on this phone first (open the <a href="gala/">gala door</a> and type your code word), then tap again.</div>');

  const s = DB.get(), r = Clock.read(s), Q = STORY.coat || null;
  const kind = tag.quest ? 'quest' : 'story';
  try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(40); } catch (e) { }

  /* ================= host view: every version of this tag, to check the wording ================= */
  if (host) {
    const rows = [];
    if (tag.where) rows.push(`<div class="sc-warn"><b>Where it goes:</b> ${esc(tag.where)}</div>`);
    if (kind === 'story') {
      Object.entries(tag.groups || {}).forEach(([g, t]) => rows.push(`<div class="sc-ok"><b>${esc((STORY.groups[g] || {}).name || g)}:</b> ${esc(t)}</div>`));
      Object.entries(tag.people || {}).forEach(([p, t]) => rows.push(`<div class="sc-ok"><b>${esc((G.byId(p) || {}).name || p)} only:</b> ${esc(t)}</div>`));
    } else rows.push(`<div class="sc-ok"><b>Anyone not on this stop sees:</b> ${esc(tag.idle || '')}</div>`);
    if (kind === 'quest' && Q) {
      const L = Q.levels;
      L.forEach((lv, j) => {
        const t = (lv.visits || {})[tag.quest] || (lv.notes || {})[tag.quest] || (lv.tap === tag.quest ? (lv.found || lv.q || '') : '');
        if (t) rows.push(`<div class="sc-ok"><b>Level ${j + 1}, ${esc(lv.name)}:</b> ${esc(t)}</div>`);
      });
      if (tag.quest === 'start') rows.push(`<div class="sc-ok"><b>Before the case is taken:</b> ${esc(Q.poster)}</div>`);
      const won = Object.entries((s.hunt || {}).won || {}).sort((a, b) => a[1] - b[1]);
      const going = Object.entries(s.huntp || {}).filter(([pid, p]) => p && p.step > 0 && !((s.hunt || {}).won || {})[pid]);
      rows.push(`<div class="sc-warn"><b>${esc(Q.title)}.</b> Finished: ${won.length ? won.map(([w], i) => esc((G.byId(w) || {}).name || w) + (i ? '' : ' (first)')).join(', ') : 'nobody yet'}. Still looking: ${going.length ? going.map(([pid, p]) => `${esc((G.byId(pid) || {}).name || pid)} (level ${Math.min(p.step, L.length)})`).join(', ') : 'nobody'}.</div>`);
    }
    return page(`<h1>${esc(tag.title || id)}</h1><p class="who">Host view · ${esc(kind === 'story' ? 'story tag' : Q ? Q.title + ' stop' : 'quest stop')}</p>${rows.join('')}`);
  }

  /* ================= the story tag (part of the mystery) ================= */
  if (kind === 'story') {
    const o = tag.opens || {}, pi = o.phase ? STORY.phases.findIndex(p => p.id === o.phase) : -1;
    const open = r.state === 'over' || (pi < 0 ? r.state !== 'before' : r.i >= pi);
    const line = (tag.people || {})[me.id] || (tag.groups || {})[me.group] || '';
    const u = {}; Clock.log(u, 'evidence', `${me.name} tapped the NFC tag (${tag.where || id})${open ? '' : ' before it opened'}.`); DB.update(u);
    if (!open) return page('<h1>' + esc(tag.title || 'A small tag') + '</h1><p class="who">A blank sticker. Nothing on it yet.</p>');
    return page(`<h1>${esc(tag.title || 'A small tag')}</h1><p class="who">${esc(me.name.split(' ')[0])}, only you can see this.</p><div class="sc-ok">${esc(line || 'Nothing here means anything to you.')}</div>${back}`);
  }

  /* ================= a stop on Cliff's Coat (js/coat.js): record it; the case file is its own tab in the app ================= */
  if (typeof Coat === 'undefined' || !Q) return page(`<h1>${esc(tag.title || 'A small tag')}</h1><div class="sc-ok">${esc(tag.idle || '')}</div>${back}`);
  const show = res => {
    const link = res.link ? `<a class="hu-btn hu-wide hu-link" href="app.html?tab=coat">Open your case file</a>` : '';
    page(`<section class="hu"><div class="hu-card">${res.kick ? `<small class="hu-kick">${esc(res.kick)}</small>` : ''}<h2 class="hu-h">${esc(res.title || '')}</h2><p class="hu-intro">${esc(res.body || '')}</p>${res.start ? '<button class="hu-btn hu-wide" id="hgo">Take the case</button>' : ''}${link}</div></section>${back}`);
    const go = $('#hgo');
    if (go) go.addEventListener('click', () => { Coat.begin(me); show({ kick: Q.title, title: 'Case taken', body: 'You have a new tab on your phone: "Coat". It holds your case file: what to do next, everything you find, and where to answer. It is separate from the rest of the game.', link: true }); });
  };
  show(Coat.tap(me, tag.quest));
});
